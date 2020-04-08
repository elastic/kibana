class Exception
  def to_json
    {"exception_name" => self.class.name, "message" => message}
  end
end
