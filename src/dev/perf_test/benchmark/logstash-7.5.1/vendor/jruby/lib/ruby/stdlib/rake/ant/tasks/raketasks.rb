require 'rubygems'
require 'rake'
require 'ant'

class RakeWrapper
  def load_tasks(*args)
    # FIXME: Use our arguments (this sucks...let's submit a patch for Rake
    ARGV.clear
    ARGV.concat args

    Rake.application.tap do |application|
      application.init
      application.load_rakefile
    end
  end

  def execute(*args)
    load_tasks(*args).top_level
  end

  def invoke_task(task)
    Rake.application[task].invoke
  end

  def import(*args)
    ant = Ant.new
    load_tasks(*args).tasks.each { |rake_task| ant.add_target rake_task }
  end
end
