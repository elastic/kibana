class Pry
  class Command::ShellMode < Pry::ClassCommand
    match 'shell-mode'
    group 'Input and Output'
    description 'Toggle shell mode. Bring in pwd prompt and file completion.'

    banner <<-'BANNER'
      Toggle shell mode. Bring in pwd prompt and file completion.
    BANNER

    def process
      state.disabled ^= true

      if state.disabled
        state.prev_prompt = _pry_.prompt
        _pry_.prompt = Pry::Prompt[:shell][:value]
      else
        _pry_.prompt = state.prev_prompt
      end
    end
  end

  Pry::Commands.add_command(Pry::Command::ShellMode)
  Pry::Commands.alias_command 'file-mode', 'shell-mode'
end
