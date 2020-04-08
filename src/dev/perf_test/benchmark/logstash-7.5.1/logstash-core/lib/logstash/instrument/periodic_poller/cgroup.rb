# encoding: utf-8

# Logic from elasticsearch/core/src/main/java/org/elasticsearch/monitor/os/OsProbe.java
# Move to ruby to remove any existing dependency
module LogStash module Instrument module PeriodicPoller
  class Cgroup
    include LogStash::Util::Loggable
    class Override
      attr_reader :key, :value
      def initialize(key)
        @key = key
        @value = java.lang.System.getProperty(@key)
      end

      def nil?
        value.nil?
      end

      def override(other)
        nil? ? other : value
      end
    end

    ## `/proc/self/cgroup` contents look like this
    # 5:cpu,cpuacct:/
    # 4:cpuset:/
    # 2:net_cls,net_prio:/
    # 0::/user.slice/user-1000.slice/session-932.scope
    ## e.g. N:controller:/path-to-info
    # we find the controller and path
    # we skip the line without a controller e.g. 0::/path
    # we assume there are these symlinks:
    # `/sys/fs/cgroup/cpu` -> `/sys/fs/cgroup/cpu,cpuacct
    # `/sys/fs/cgroup/cpuacct` -> `/sys/fs/cgroup/cpu,cpuacct

    CGROUP_FILE = "/proc/self/cgroup"
    CPUACCT_DIR = "/sys/fs/cgroup/cpuacct"
    CPU_DIR = "/sys/fs/cgroup/cpu"
    CRITICAL_PATHS = [CGROUP_FILE, CPUACCT_DIR, CPU_DIR]

    CONTROLLER_CPUACCT_LABEL = "cpuacct"
    CONTROLLER_CPU_LABEL = "cpu"

    class CGroupResources
      CONTROL_GROUP_RE = Regexp.compile("\\d+:([^:,]+(?:,[^:,]+)?):(/.*)")
      CONTROLLER_SEPARATOR_RE = ","

      def cgroup_available?
        # don't cache to ivar, in case the files are mounted after logstash starts??
        CRITICAL_PATHS.all?{|path| ::File.exist?(path)}
      end

      def controller_groups
        response = {}
        IO.readlines(CGROUP_FILE).each do |line|
          matches = CONTROL_GROUP_RE.match(line)
          next if matches.nil?
          # multiples controls, same hierarchy
          controllers = matches[1].split(CONTROLLER_SEPARATOR_RE)
          controllers.each do |controller|
            case controller
            when CONTROLLER_CPU_LABEL
              response[controller] = CpuResource.new(matches[2])
            when CONTROLLER_CPUACCT_LABEL
              response[controller] = CpuAcctResource.new(matches[2])
            else
              response[controller] = UnimplementedResource.new(controller, matches[2])
            end
          end
        end
        response
      end
    end

    module ControllerResource
      attr_reader :base_path, :override, :offset_path
      def implemented?
        true
      end
      private
      def common_initialize(base, override_key, original_path)
        @base_path = base
        # override is needed here for the logging statements
        @override = Override.new(override_key)
        @offset_path = @override.override(original_path)
        @procs = {}
        @procs[:read_int] = lambda {|path| IO.readlines(path).first.to_i }
        @procs[:read_lines] = lambda {|path| IO.readlines(path) }
      end
      def call_if_file_exists(call_key, file, not_found_value)
        path = ::File.join(@base_path, @offset_path, file)
        if ::File.exist?(path)
          @procs[call_key].call(path)
        else
          message = "File #{path} cannot be found, "
          if override.nil?
            message.concat("try providing an override '#{override.key}' in the Logstash JAVA_OPTS environment variable")
          else
            message.concat("even though the '#{override.key}' override is: '#{override.value}'")
          end
          logger.debug(message)
          not_found_value
        end
      end
    end

    class CpuAcctResource
      include LogStash::Util::Loggable
      include ControllerResource
      def initialize(original_path)
        common_initialize(CPUACCT_DIR, "ls.cgroup.cpuacct.path.override", original_path)
      end
      def to_hash
        {:control_group => offset_path, :usage_nanos => cpuacct_usage}
      end
      private
      def cpuacct_usage
        call_if_file_exists(:read_int, "cpuacct.usage", -1)
      end
    end

    class CpuResource
      include LogStash::Util::Loggable
      include ControllerResource
      def initialize(original_path)
        common_initialize(CPU_DIR, "ls.cgroup.cpu.path.override", original_path)
      end
      def to_hash
        {
          :control_group => offset_path,
          :cfs_period_micros => cfs_period_us,
          :cfs_quota_micros => cfs_quota_us,
          :stat => build_cpu_stats_hash
        }
      end
      private
      def cfs_period_us
        call_if_file_exists(:read_int, "cpu.cfs_period_us", -1)
      end
      def cfs_quota_us
        call_if_file_exists(:read_int, "cpu.cfs_quota_us", -1)
      end
      def build_cpu_stats_hash
        stats = CpuStats.new
        lines = call_if_file_exists(:read_lines, "cpu.stat", [])
        stats.update(lines)
        stats.to_hash
      end
    end

    class UnimplementedResource
      attr_reader :controller, :original_path
      def initialize(controller, original_path)
        @controller, @original_path = controller, original_path
      end
      def implemented?
        false
      end
    end

    class CpuStats
      def initialize
        @number_of_elapsed_periods = -1
        @number_of_times_throttled = -1
        @time_throttled_nanos = -1
      end
      def update(lines)
        lines.each do |line|
          fields = line.split(/\s+/)
          next unless fields.size > 1
          case fields.first
          when "nr_periods" then @number_of_elapsed_periods = fields[1].to_i
          when "nr_throttled" then @number_of_times_throttled = fields[1].to_i
          when "throttled_time" then @time_throttled_nanos = fields[1].to_i
          end
        end
      end
      def to_hash
        {
          :number_of_elapsed_periods => @number_of_elapsed_periods,
          :number_of_times_throttled => @number_of_times_throttled,
          :time_throttled_nanos => @time_throttled_nanos
        }
      end
    end

    CGROUP_RESOURCES = CGroupResources.new

    class << self
      def get_all
        unless CGROUP_RESOURCES.cgroup_available?
          logger.debug("One or more required cgroup files or directories not found: #{CRITICAL_PATHS.join(', ')}")
          return
        end

        groups = CGROUP_RESOURCES.controller_groups

        if groups.empty?
          logger.debug("The main cgroup file did not have any controllers: #{CGROUP_FILE}")
          return
        end

        cgroups_stats = {}
        groups.each do |name, controller|
          next unless controller.implemented?
          cgroups_stats[name.to_sym] = controller.to_hash
        end
        cgroups_stats
      rescue => e
        logger.debug("Error, cannot retrieve cgroups information", :exception => e.class.name, :message => e.message, :backtrace => e.backtrace.take(4)) if logger.debug?
        nil
      end

      def get
        get_all
      end
    end
  end
end end end
