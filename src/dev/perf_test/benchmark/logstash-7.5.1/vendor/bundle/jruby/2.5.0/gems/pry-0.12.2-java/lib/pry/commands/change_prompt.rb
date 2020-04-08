class Pry::Command::ChangePrompt < Pry::ClassCommand
  match 'change-prompt'
  group 'Input and Output'
  description 'Change the current prompt.'
  command_options argument_required: true
  banner <<-BANNER
    Usage: change-prompt [OPTIONS] [NAME]

    Change the current prompt.
  BANNER

  def options(opt)
    opt.on(:l, :list, 'List the available prompts')
  end

  def process(prompt)
    if opts.present?(:l)
      list_prompts
    else
      change_prompt(prompt)
    end
  end

  private

  def list_prompts
    prompts = Pry::Prompt.all.map do |name, prompt|
      "#{bold(name)}#{red(' (selected)') if _pry_.prompt == prompt[:value]}\n" +
        prompt[:description]
    end
    output.puts(prompts.join("\n"))
  end

  def change_prompt(prompt)
    if Pry::Prompt.all.key?(prompt)
      _pry_.prompt = Pry::Prompt.all[prompt][:value]
    else
      raise(Pry::CommandError, <<MSG)
'#{prompt}' isn't a known prompt. Run `change-prompt --list` to see
the list of known prompts.
MSG
    end
  end

  Pry::Commands.add_command(self)
end
