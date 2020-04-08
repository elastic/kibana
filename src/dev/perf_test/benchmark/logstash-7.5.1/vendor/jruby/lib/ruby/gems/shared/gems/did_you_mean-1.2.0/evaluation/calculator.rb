# frozen-string-literal: true

require 'benchmark'
require 'did_you_mean'

def report(message, &block)
  time = 1000 * Benchmark.realtime(&block)

  if (time / 1000 / 60) >= 1
    minutes = (time / 1000 / 60).floor
    seconds = (time % (60 * 1000)) / 1000

    puts " \e[36m%2dm%.3fs:\e[0m %s" % [minutes, seconds, message]
  elsif (time / 1000) >= 1
    seconds = (time % (60 * 1000)) / 1000

    puts " \e[36m%9.3fs:\e[0m %s" % [seconds, message]
  else
    puts " \e[36m%8.1fms:\e[0m %s" % [time, message]
  end

  time
end

puts "did_you_mean version: #{DidYouMean::VERSION}\n\n"

report "loading program" do
  require 'yaml'
  require 'set'

  begin
    require 'jaro_winkler'
    DidYouMean::JaroWinkler.module_eval do
      module_function
      def distance(str1, str2)
        ::JaroWinkler.distance(str1, str2)
      end if RUBY_ENGINE != 'jruby'
    end
  rescue LoadError, NameError => e
    puts "couldn't load the jaro_winkler gem: #{e.message}\n\n"
  end
end

report "loading dictionary" do
  yaml = open("evaluation/dictionary.yml").read
  yaml = YAML.load(yaml).map{|word| word.downcase.tr(" ", "_") }

  DICTIONARY = Set.new(yaml)
end

report "loading correct/incorrect words" do
  SPELL_CHECKER   = DidYouMean::SpellChecker.new(dictionary: DICTIONARY)
  INCORRECT_WORDS = YAML.load(open("evaluation/incorrect_words.yaml").read)
end

total_count         = 0
correct_count       = 0
words_not_corrected = []
filename            = "log/words_not_corrected_#{Time.now.to_i}.yml"

puts <<-MSG

 Total number of test data: #{INCORRECT_WORDS.size}

MSG

report "calculating accuracy" do
  INCORRECT_WORDS.each_with_index do |(expected, user_input), index|
    if DICTIONARY.include?(expected)
      total_count += 1

      corrections = SPELL_CHECKER.correct(user_input)
      if corrections.first == expected
        correct_count += 1
      else
        words_not_corrected << {
          'input'    => user_input,
          'expected' => expected,
          'actual'   => corrections
        }
      end
    end

    puts "processed #{index} items" if index % 100 == 0
  end

  puts "\n"
end

puts <<-MSG

Evaulation result

  Total count  : #{total_count}
  Correct count: #{correct_count}
  Accuracy     : #{correct_count.to_f / total_count}

MSG

Dir.mkdir('log') unless File.exist?('log')
File.open(filename, 'w') do |file|
  file.write(words_not_corrected.to_yaml)
end

puts "Incorrect corrections were logged to #{filename}."
