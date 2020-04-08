require 'java'

class Rake::Ant
  java_import org.apache.tools.ant.Target

  class RakeTarget < Target
    ALREADY_DEFINED_PREFIX = "rake_"

    def initialize(ant, rake_task)
      super()
      set_project ant.project
      set_name generate_unique_target_name rake_task.name

      rake_task.prerequisites.each { |prereq| add_dependency prereq }

      @rake_task = rake_task
    end

    def execute
      @rake_task.execute
    end

    private
    def generate_unique_target_name(name)
      # FIXME: This is not guaranteed to be unique and may be a wonky naming convention?
      if project.targets.get(name)
        project.log "ant already defines #{name}.  Redefining as #{ALREADY_DEFINED_PREFIX}#{name}"
        name = ALREADY_DEFINED_PREFIX + name
      end
      name
    end
  end

  class BlockTarget < Target
    def initialize(ant, *options, &block)
      super()
      set_project ant.project
      hash = extract_options(options)
      hash.each_pair {|k,v| send("set_#{k}", v) }
      @ant, @block = ant, block
    end

    def execute
      # Have to dupe this logic b/c Ant doesn't provide a way to
      # override inner part of execute
      if_cond, unless_cond = if_condition, unless_condition
      if if_cond && unless_cond
        execute_target
      elsif !if_cond
        project.log(self, "Skipped because property '#{if_cond}' not set.", Project::MSG_VERBOSE)
      else
        project.log(self, "Skipped because property '#{unless_cond}' set.", Project::MSG_VERBOSE)
      end
    end

    def defined_tasks
      define_target.tasks
    end

    private
    def extract_options(options)
      hash = Hash === options.last ? options.pop : {}
      hash[:name] = options[0].to_s if options[0]
      hash[:description] = options[1].to_s if options[1]
      hash
    end

    def if_condition
      cond = get_if
      return true unless cond
      val = project.replace_properties(cond)
      project.get_property(val) && val
    end

    def unless_condition
      cond = get_unless
      return true unless cond
      val = project.replace_properties(cond)
      project.get_property(val).nil? && val
    end

    def execute_target
      @ant.instance_eval(&@block) if @block
    end

    def define_target
      Target.new.tap do |t|
        t.name = ""
        begin
          @ant.current_target = t
          execute_target
        ensure
          @ant.current_target = nil
        end
      end
    end
  end

  class TargetWrapper
    def initialize(project, name)
      @project, @name = project, name
    end

    def execute
      @project.execute_target(@name)
    end
  end

  class MissingWrapper
    def initialize(project, name)
      @project_name = project.name || "<anonymous>"
      @name = name
    end

    def execute
      raise "Target `#{@name}' does not exist in project `#{@project_name}'"
    end
  end
end
