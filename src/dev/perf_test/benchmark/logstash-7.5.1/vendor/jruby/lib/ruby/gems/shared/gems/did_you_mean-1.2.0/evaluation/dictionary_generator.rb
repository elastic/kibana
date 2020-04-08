require 'open-uri'
require 'cgi'
require 'json'

per_page = 500
base_url = "https://simple.wiktionary.org/w/api.php?action=query&aplimit=#{per_page}&list=allpages&format=json"
filename = "evaluation/dictionary.yml"
apfrom   = ""
num      = 0
titles   = []

loop do
  url = base_url + "&apfrom=#{apfrom}"

  puts "downloading page %2d: #{url}" % num

  body   = open(url).read
  json   = JSON.load(body)
  count  = json["query"]["allpages"].size
  apfrom = CGI.escape(json["query"]["allpages"].last['title']) if count > 0

  titles += json["query"]["allpages"].map {|hash| hash["title"] }
  num    += 1

  break if count != per_page
end

require 'yaml'

File.open(filename, 'w') do |file|
  file.write(titles.uniq.to_yaml)
end

puts "
Number of titles: #{titles.uniq.size}
Dictionary saved: #{filename}
"
