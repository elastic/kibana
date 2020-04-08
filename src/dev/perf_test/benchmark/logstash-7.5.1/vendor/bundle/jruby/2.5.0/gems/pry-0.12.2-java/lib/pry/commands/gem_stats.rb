class Pry::Command::GemStat < Pry::ClassCommand
  require 'json'
  require 'net/http'
  STAT_HOST = "rubygems.org"
  STAT_PORT = 443
  STAT_PATH = "/api/v1/gems/%s.json"
  FAIL_WHALE = <<-FAILWHALE
W     W      W
W        W  W     W
              '.  W
  .-""-._     \ \.--|
 /       "-..__) .-'
|     _         /
\'-.__,   .__.,'
 `'----'._\--'
VVVVVVVVVVVVVVVVVVVVV
FAILWHALE

  match 'gem-stat'
  description 'Show the statistics of a gem (requires internet connection)'
  group 'Gems'
  command_options argument_required: true
  banner <<-BANNER
    gem-stats name

    Show the statistics of a gem.
    Requires an internet connection.
  BANNER

  def process(name)
    client = Net::HTTP.start STAT_HOST, STAT_PORT, use_ssl: true
    res = client.get STAT_PATH % URI.encode_www_form_component(name)
    case res
    when Net::HTTPOK
      _pry_.pager.page format_gem(JSON.parse(res.body))
    when Net::HTTPServiceUnavailable
      _pry_.pager.page <<-FAILURE
#{bright_blue(FAIL_WHALE)}
#{bright_red('Ruby On Rails')}
#{bright_red('Net::HTTPServiceUnavailable')}
      FAILURE
    else
      raise Pry::CommandError, "Bad response (#{res.class})"
    end
  ensure
    client.finish if client
  end

  private
  def format_gem(h)
    h = Pry::Config.from_hash(h, nil)
    format_str = unindent <<-FORMAT
    %{name} %{version}
    --
    Total Downloads   : %{downloads}
    Version Downloads : %{version_downloads}

    #{red('Dependencies')} (runtime)
    --
    %{rdependencies}

    #{red('Dependencies')} (development)
    %{ddependencies}
    FORMAT
    format_str % {name: green(h.name),
                  version: bold("v#{h.version}"),
                  downloads: h.downloads,
                  version_downloads: h.version_downloads,
                  rdependencies: format_dependencies(h.dependencies.runtime),
                  ddependencies: format_dependencies(h.dependencies.development)}
  end

  def format_dependencies(rdeps)
    return bold('None') if rdeps.empty?

    with_line_numbers(
      rdeps.map { |h| "#{h['name']} (#{h['requirements']})" }.join("\n"),
      1,
      :bold
    )
  end
  Pry::Commands.add_command(self)
end
