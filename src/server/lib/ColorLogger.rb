require "rack/commonlogger"
require "colorize"

class ColorLogger < Rack::CommonLogger
  def log(env, status, header, begin_at)
    now = Time.now
    length = extract_content_length(header)

    case status
    when 300..399
      statusColor = :yellow
    when 400..499
      statusColor = :red
    when 500..599
      statusColor = :magenta
    else
      statusColor = :green
    end

    msg  = (now.strftime('%b %d, %Y @ %H:%M:%S.%L')).light_black << ' '
    msg << env["REQUEST_METHOD"].light_blue << ' '
    msg << env["PATH_INFO"]
    msg << (env["QUERY_STRING"].empty? ? '' : "?#{env["QUERY_STRING"]}" ) << ' '
    msg << status.to_s.send(statusColor) << ' '
    msg << ((now - begin_at) * 1000).to_i.to_s << 'ms - ' << length
    msg << "\n"

    # If there is an error then we need to append the stack
    if env['sinatra.error'] && status != 404
      error = env['sinatra.error']
      msg << "#{error.message}\n  #{error.backtrace.join("\n  ")}".send(statusColor)
      msg << "\n"
    end

    logger = @logger || env['rack.errors']
    if logger.respond_to?(:write)
      logger.write(msg)
    else
      logger << msg
    end
  end
end


