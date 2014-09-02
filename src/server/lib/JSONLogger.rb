require "rack/commonlogger"

class JSONLogger < Rack::CommonLogger
  def log(env, status, header, begin_at)
    now = Time.now
    length = extract_content_length(header)

    data = {
      "@timestamp" => now.iso8601,
      :status => status.to_s[0..3],
      :level => status < 399 ? "INFO" : 'ERROR',
      :name => "Kibana",
      :request_method => env["REQUEST_METHOD"],
      :request => env["PATH_INFO"] + (env["QUERY_STRING"].empty? ? "" : "#{env['QUERY_STRING']}"),
      :path => env["PATH_INFO"],
      :query_string => env["QUERY_STRING"],
      :remote_addr => env['HTTP_X_FORWARD_FOR'] || env["REMOTE_ADDR"],
      :remote_user => env["REMOTE_USER"],
      :http_version => env["HTTP_VERSION"],
      :content_length => length,
      :response_time => ((now - begin_at) * 1000).to_i # convert to milliseconds
    }

    # If there is an error then we need to append the stack
    if env['sinatra.error']
      error = env['sinatra.error']
      data[:error] = {
        :name => error.class.to_s,
        :message => error.message,
        :stack => error.backtrace
      }
    end

    data[:message] = "#{data[:request_method]} #{data[:path]+(data[:query_string].empty? ? '' : '?'+data[:query_string])} #{data[:status]} #{data[:response_time]}ms - #{data[:content_length].empty? ? '-' : data[:content_length]}"

    logger = @logger || env['rack.errors']
    msg = data.to_json+"\n"

    if logger.respond_to?(:write)
      logger.write(msg)
    else
      logger << msg
    end
  end
end

