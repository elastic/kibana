# Mocked NewRelic::Agent used for testing

module NewRelic
  module Agent
    def self.notice_error(message, hash)
    end
  end
end
