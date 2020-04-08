module JMS
  # Full Qualified name causes a Java exception
  java_import 'oracle.jms.AQjmsFactory'

  # Connection Factory to support Oracle AQ
  class OracleAQConnectionFactory
    attr_accessor :username, :url
    attr_writer :password

    # Creates a connection per standard JMS 1.1 techniques from the Oracle AQ JMS Interface
    def create_connection(*args)
      # Since username and password are not assigned (see lib/jms/connection.rb:200)
      # and connection_factory.create_connection expects 2 arguments when username is not null ...
      if args.length == 2
        @username = args[0]
        @password = args[1]
      end

      # Full Qualified name causes a Java exception
      #cf = oracle.jms.AQjmsFactory.getConnectionFactory(@url, java.util.Properties.new)
      cf = AQjmsFactory.getConnectionFactory(@url, java.util.Properties.new)

      if username
        cf.createConnection(@username, @password)
      else
        cf.createConnection()
      end
    end
  end

end
