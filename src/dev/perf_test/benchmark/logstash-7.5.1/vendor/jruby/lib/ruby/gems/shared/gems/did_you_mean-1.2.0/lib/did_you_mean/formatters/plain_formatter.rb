# frozen-string-literal: true

module DidYouMean
  class PlainFormatter
    def message_for(corrections)
      corrections.empty? ? "" : "\nDid you mean?  #{corrections.join("\n               ")}"
    end
  end
end
