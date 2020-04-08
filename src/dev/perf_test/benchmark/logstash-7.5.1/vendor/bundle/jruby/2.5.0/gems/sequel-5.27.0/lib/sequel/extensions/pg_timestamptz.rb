# frozen-string-literal: true
#
# The pg_timestamptz extension changes the default timestamp
# type for the database to be +timestamptz+ (+timestamp with time zone+)
# instead of +timestamp+ (+timestamp without time zone+).  This is
# recommended if you are dealing with multiple timezones in your application.
# 
# To load the extension into the database:
#
#   DB.extension :pg_timestamptz
#
# Related module: Sequel::Postgres::Timestamptz

#
module Sequel
  module Postgres
    module Timestamptz
      # Use timestamptz by default for generic timestamp value.
      def type_literal_generic_datetime(column)
        :timestamptz
      end
    end
  end

  Database.register_extension(:pg_timestamptz, Postgres::Timestamptz)
end
