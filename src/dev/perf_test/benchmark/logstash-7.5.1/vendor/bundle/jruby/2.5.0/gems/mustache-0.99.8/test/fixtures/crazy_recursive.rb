$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'
require 'mustache'

class CrazyRecursive < Mustache
  self.path = File.dirname(__FILE__)

  def top_nodes
    [{ :contents => "1",
       :children =>
       [{ :contents => "2",
          :children =>
          [{ :contents => "3",
             :children => []
           }]
        },
        { :contents => "4",
          :children =>
          [{ :contents => "5",
             :children =>
             [{ :contents => "6",
                :children => []
              }]
           }]
        }]
     }]
  end
end

if $0 == __FILE__
  puts CrazyRecursive.to_html
end
