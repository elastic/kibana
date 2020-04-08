# encoding: utf-8

module LogStash module PluginMixins module Jdbc
  class WrappedDriver
    java_implements java.sql.Driver

    def initialize(drv)
      @driver = drv
    end

    java_signature 'boolean acceptsURL(String u) throws SQLException'
    def accepts_url(u)
      @driver.accepts_url(u)
    end

    java_signature 'Connection connect(String u, Properties p)'
    def connect(url, props)
      @driver.connect(url, props)
    end

    java_signature 'int getMajorVersion()'
    def get_major_version()
      @driver.get_major_version()
    end

    java_signature 'int getMinorVersion()'
    def get_minor_version()
      @driver.get_minor_version()
    end

    java_signature 'DriverPropertyInfo[] getPropertyInfo(String u, Properties p)'
    def get_property_info(url, props)
      @driver.get_property_info(url, props)
    end

    java_signature 'boolean jdbcCompliant()'
    def jdbc_compliant()
      @driver.jdbc_compliant
    end

    java_signature 'Logger getParentLogger() throws SQLFeatureNotSupportedException'
    def get_parent_logger()
      @driver.get_parent_logger
    end
  end
end end end
