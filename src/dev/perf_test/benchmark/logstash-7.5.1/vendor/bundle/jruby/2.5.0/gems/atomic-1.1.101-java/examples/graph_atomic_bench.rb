#!/usr/bin/env ruby

# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require 'optparse'

conf = {
  :vary => "threads",
  :lock => "atomic"
}

OptionParser.new do |opts|
  opts.on("-l", "--lock atomic|mutex") do |l|
    conf[:lock] = l
  end
  opts.on("-v", "--vary threads|speed") do |v|
    conf[:vary] = v
  end
  opts.on("-h", "--help"){ puts opts; exit }
end.parse!(ARGV)

result = File.open("results_#{conf[:lock]}_#{conf[:vary]}.csv", "w")


if conf[:vary] == "threads"
  # Vary the number of concurrent threads that update the value.
  #
  # There is a total count of 1mio updates that is distributed
  # between the number of threads.
  #
  # A pair number of threads is used so that even add and odd substract 1.
  # This avoid creating instances for Bignum since the number should
  # stay in the Fixnum range.
  #
  (1..100).each do |i|
    i = i * 2

    ret = []
    10.times do
      ret << `ruby ./bench_atomic_1.rb -l #{conf[:lock]} -t #{i}`.to_f
    end

    line = ([i] + ret).join(', ')

    puts line
    result.puts line
  end
elsif conf[:vary] == "speed"
  # Varies the execution time of the update block
  # by using long calulation (MD5)
  #
  # NOTE: Thread.pass and sleep() are not usable by the atomic
  #       lock. It needs to run the whole block without hitting
  #       another atomic update otherwise it has to retry
  #
  # The expected result is that the atomic lock's performance
  # will hit a certain threshold where it will be worse than mutexes.
  #
  (1..30).each do |i|

    ret = []
    10.times do
      ret << `ruby ./bench_atomic_1.rb -l #{conf[:lock]} -s #{i}`.to_f
    end

    line = ([i] + ret).join(', ')

    puts line
    result.puts line
  end
end
