module Pry::Helpers; end

# rubocop:disable Metrics/ModuleLength
module Pry::Helpers::BaseHelpers
  extend self

  @mac_osx_warn = false
  # @deprecated Use {Pry::Helpers::Platform.mac_osx?} instead.
  def mac_osx?
    unless @mac_osx_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @mac_osx_warn = true
    end
    Pry::Helpers::Platform.mac_osx?
  end

  @linux_warn = false
  # @deprecated Use {Pry::Helpers::Platform.mac_osx?} instead.
  def linux?
    unless @linux_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @linux_warn = true
    end
    Pry::Helpers::Platform.linux?
  end

  @windows_warn = false
  # @deprecated Use {Pry::Helpers::Platform.windows?} instead.
  def windows?
    unless @windows_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @windows_warn = true
    end
    Pry::Helpers::Platform.windows?
  end

  @windows_ansi_warn = false
  # @deprecated Use {Pry::Helpers::Platform.windows_ansi?} instead.
  def windows_ansi?
    unless @windows_ansi_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @windows_ansi_warn = true
    end
    Pry::Helpers::Platform.windows_ansi?
  end

  @jruby_warn = false
  # @deprecated Use {Pry::Helpers::Platform.jruby?} instead.
  def jruby?
    unless @jruby_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @jruby_warn = true
    end
    Pry::Helpers::Platform.jruby?
  end

  @jruby19_warn = false
  # @deprecated Use {Pry::Helpers::Platform.jruby_19?} instead.
  def jruby_19?
    unless @jruby19_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @jruby19_warn = true
    end
    Pry::Helpers::Platform.jruby_19?
  end

  @mri_warn = false
  # @deprecated Use {Pry::Helpers::Platform.mri?} instead.
  def mri?
    unless @mri_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @mri_warn = true
    end
    Pry::Helpers::Platform.mri?
  end

  @mri19_warn = false
  # @deprecated Use {Pry::Helpers::Platform.mri_19?} instead.
  def mri_19?
    unless @mri19_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @mri19_warn = true
    end
    Pry::Helpers::Platform.mri_19?
  end

  @mri2_warn = false
  # @deprecated Use {Pry::Helpers::Platform.mri_2?} instead.
  def mri_2?
    unless @mri2_warn
      loc = caller_locations(1..1).first
      warn(
        "#{loc.path}:#{loc.lineno}: warning: method BaseHelpers##{__method__} " \
        "is deprecated. Use Pry:Helpers::Platform.#{__method__} instead"
      )
      @mri2_warn = true
    end
    Pry::Helpers::Platform.mri_2?
  end

  def silence_warnings
    old_verbose = $VERBOSE
    $VERBOSE = nil
    begin
      yield
    ensure
      $VERBOSE = old_verbose
    end
  end

  # Acts like send but ignores any methods defined below Object or Class in the
  # inheritance hierarchy.
  # This is required to introspect methods on objects like Net::HTTP::Get that
  # have overridden the `method` method.
  def safe_send(obj, method, *args, &block)
    (Module === obj ? Module : Object).instance_method(method).bind(obj).call(*args, &block)
  end
  public :safe_send

  def find_command(name, set = Pry::Commands)
    command_match = set.find do |_, command|
      (listing = command.options[:listing]) == name && listing != nil
    end
    command_match.last if command_match
  end

  def not_a_real_file?(file)
    file =~ /^(\(.*\))$|^<.*>$/ || file =~ /__unknown__/ || file == "" || file == "-e"
  end

  def command_dependencies_met?(options)
    return true if !options[:requires_gem]

    Array(options[:requires_gem]).all? do |g|
      Pry::Rubygem.installed?(g)
    end
  end

  def use_ansi_codes?
    Pry::Helpers::Platform.windows_ansi? || ENV['TERM'] && ENV['TERM'] != "dumb"
  end

  def colorize_code(code)
    CodeRay.scan(code, :ruby).term
  end

  def highlight(string, regexp, highlight_color = :bright_yellow)
    string.gsub(regexp) { |match| "<#{highlight_color}>#{match}</#{highlight_color}>" }
  end

  # formatting
  def heading(text)
    text = "#{text}\n--"
    "\e[1m#{text}\e[0m"
  end

  # Send the given text through the best available pager (if Pry.config.pager is
  # enabled). Infers where to send the output if used as a mixin.
  # DEPRECATED.
  def stagger_output(text, _out = nil)
    if defined?(_pry_) && _pry_
      _pry_.pager.page text
    else
      Pry.new.pager.page text
    end
  end
end
# rubocop:enable Metrics/ModuleLength
