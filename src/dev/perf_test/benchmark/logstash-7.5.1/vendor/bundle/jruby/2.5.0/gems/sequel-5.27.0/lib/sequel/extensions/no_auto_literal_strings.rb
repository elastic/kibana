# frozen-string-literal: true

Sequel::Database.register_extension(:no_auto_literal_strings){}
Sequel::Dataset.register_extension(:no_auto_literal_strings){}
