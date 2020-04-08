class Pry
  class Config < Pry::BasicObject
    class Default
      include Config::Behavior
      include Config::Memoization

      def_memoized({
        input: proc {
          lazy_readline
        },
        output: proc {
          $stdout.tap { |out| out.sync = true }
        },
        commands: proc {
          Pry::Commands
        },
        prompt_name: proc {
          Pry::Prompt::DEFAULT_NAME
        },
        prompt: proc {
          Pry::Prompt[:default][:value]
        },
        prompt_safe_contexts: proc {
          Pry::Prompt::SAFE_CONTEXTS
        },
        print: proc {
          Pry::DEFAULT_PRINT
        },
        quiet: proc {
          false
        },
        exception_handler: proc {
          Pry::DEFAULT_EXCEPTION_HANDLER
        },
        exception_whitelist: proc {
          Pry::DEFAULT_EXCEPTION_WHITELIST
        },
        hooks: proc {
          Pry::DEFAULT_HOOKS
        },
        pager: proc {
          true
        },
        system: proc {
          Pry::DEFAULT_SYSTEM
        },
        color: proc {
          Pry::Helpers::BaseHelpers.use_ansi_codes?
        },
        default_window_size: proc {
          5
        },
        editor: proc {
          Pry.default_editor_for_platform
        },
        should_load_rc: proc {
          true
        },
        should_load_local_rc: proc {
          true
        },
        should_trap_interrupts: proc {
          Pry::Helpers::Platform.jruby?
        },
        disable_auto_reload: proc {
          false
        },
        command_prefix: proc {
          ""
        },
        auto_indent: proc {
          Pry::Helpers::BaseHelpers.use_ansi_codes?
        },
        correct_indent: proc {
          true
        },
        collision_warning: proc {
          false
        },
        output_prefix: proc {
          "=> "
        },
        requires: proc {
          []
        },
        should_load_requires: proc {
          true
        },
        should_load_plugins: proc {
          true
        },
        windows_console_warning: proc {
          true
        },
        control_d_handler: proc {
          Pry::DEFAULT_CONTROL_D_HANDLER
        },
        memory_size: proc {
          100
        },
        extra_sticky_locals: proc {
          {}
        },
        command_completions: proc {
          proc { commands.keys }
        },
        file_completions: proc {
          proc { Dir["."] }
        },
        ls: proc {
          Pry::Config.from_hash(Pry::Command::Ls::DEFAULT_OPTIONS)
        },
        completer: proc {
          require "pry/input_completer"
          Pry::InputCompleter
        },
        gist: proc {
          Pry::Config.from_hash({inspecter: proc(&:pretty_inspect)}, nil)
        },
        history: proc {
          Pry::Config.from_hash({should_save: true, should_load: true}, nil).tap do |history|
            history_file =
              if File.exist?(File.expand_path('~/.pry_history'))
                '~/.pry_history'
              elsif ENV.key?('XDG_DATA_HOME') && ENV['XDG_DATA_HOME'] != ''
                # See XDG Base Directory Specification at
                # https://standards.freedesktop.org/basedir-spec/basedir-spec-0.8.html
                ENV['XDG_DATA_HOME'] + '/pry/pry_history'
              else
                '~/.local/share/pry/pry_history'
              end
            history.file = File.expand_path(history_file)
          end
        },
        exec_string: proc {
          ""
        }
      })

      def initialize
        super(nil)
      end

      private

      def lazy_readline
        require 'readline'
        Readline
      rescue LoadError
        warn "Sorry, you can't use Pry without Readline or a compatible library."
        warn "Possible solutions:"
        warn " * Rebuild Ruby with Readline support using `--with-readline`"
        warn " * Use the rb-readline gem, which is a pure-Ruby port of Readline"
        warn " * Use the pry-coolline gem, a pure-ruby alternative to Readline"
        raise
      end
    end
  end
end
