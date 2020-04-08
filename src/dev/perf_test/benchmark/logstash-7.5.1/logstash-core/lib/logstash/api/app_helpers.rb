# encoding: utf-8
require "logstash/json"
require "logstash/api/errors"

module LogStash::Api::AppHelpers
  # This method handle both of the normal flow *happy path*
  # and the display or errors, if more custom logic is added here
  # it will make sense to separate them.
  #
  # See `#error` method in the `LogStash::Api::Module::Base`
  def respond_with(data, options={})
    as     = options.fetch(:as, :json)
    filter = options.fetch(:filter, "")

    status data.respond_to?(:status_code) ? data.status_code : 200

    if as == :json
      if api_error?(data)
        data = generate_error_hash(data)
      else
        selected_fields = extract_fields(filter.to_s.strip)
        data.select! { |k,v| selected_fields.include?(k) } unless selected_fields.empty?
        unless options.include?(:exclude_default_metadata)
          data = data.to_hash
          if data.values.size == 0 && selected_fields.size > 0
            raise LogStash::Api::NotFoundError
          end
          data = default_metadata.merge(data)
        end
      end

      content_type "application/json"
      LogStash::Json.dump(data, {:pretty => pretty?})
    else
      content_type "text/plain"
      data.to_s
    end
  end

  protected
  def extract_fields(filter_string)
    (filter_string.empty? ? [] : filter_string.split(",").map { |s| s.strip.to_sym })
  end

  def as_boolean(string)
    return true   if string == true   || string =~ (/(true|t|yes|y|1)$/i)
    return false  if string == false  || string.blank? || string =~ (/(false|f|no|n|0)$/i)
    raise ArgumentError.new("invalid value for Boolean: \"#{string}\"")
  end

  def default_metadata
    @factory.build(:default_metadata).all
  end

  def api_error?(error)
    error.is_a?(LogStash::Api::ApiError)
  end

  def pretty?
    params.has_key?("pretty")
  end

  def generate_error_hash(error)
    {
      :path => request.path,
      :status => error.status_code,
      :error => error.to_hash
    }
  end

  def human?
    params.has_key?("human") && (params["human"].nil? || as_boolean(params["human"]) == true)
  end
end
