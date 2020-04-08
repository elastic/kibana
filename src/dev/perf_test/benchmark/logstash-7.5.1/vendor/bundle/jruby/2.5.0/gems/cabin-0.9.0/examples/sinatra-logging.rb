require "rubygems"
require "sinatra"
$: << "./lib"
require "cabin"
require "logger"

$logger = Cabin::Channel.new
$logger.subscribe(Logger.new(STDOUT))

def serve_it_up(arg)
  $logger.info("Serving it up")
  sleep 2
  "Hello, #{arg}!"
end

get "/hello/:name" do
  context = $logger.context
  context[:name] = params[:name]
  context[:verb] = "GET"
  timer = $logger.time("serve_it_up latency")
  result = serve_it_up(params[:name])
  timer.stop

  # Clear the context so that the next request doesn't have tainted context.
  context.clear
  return result
end
