require 'jruby'

trap 'INT' do
  runtime = JRuby.runtime
  runtime.thread_service.ruby_thread_map.each do |t, rubythread|
    context = JRuby.reference(rubythread).context
    runtime.printProfileData(context.profile_collection)
  end
  exit
end
STDERR.puts "Profiling enabled; ^C shutdown will now dump profile info"
