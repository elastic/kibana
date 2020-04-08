# A sample Guardfile
# More info at https://github.com/guard/guard#readme

notification :tmux,
  :display_message => true,
  :timeout => 5, # in seconds
  :default_message_format => '%s >> %s',
  :success => 'green',
  :default_message_color => 'black',
  :line_separator => ' > ', # since we are single line we need a separator
  :color_location => 'status-left-bg' # to customize which tmux element will change color

guard :rspec, :cmd => 'rspec --color --order rand:$RANDOM' do
  watch(/^lib\/(.+)\.rb$/) { |m| "spec/#{m[1]}_spec.rb" }
  watch(/^spec\/.*\.rb$/) { |m| m[0] }
end
