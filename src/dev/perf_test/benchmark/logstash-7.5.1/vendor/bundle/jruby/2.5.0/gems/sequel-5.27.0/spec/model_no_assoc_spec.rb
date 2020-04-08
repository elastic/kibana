Dir['./spec/model/*_spec.rb'].delete_if{|f| f =~ /association|eager_loading/}.each{|f| require f}
