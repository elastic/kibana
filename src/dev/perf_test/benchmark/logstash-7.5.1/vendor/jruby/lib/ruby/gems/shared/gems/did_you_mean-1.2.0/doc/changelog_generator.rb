require 'octokit'
require 'reverse_markdown'
require 'erb'

class ChangeLogGenerator
  attr :repository, :template_path, :changelog_path

  def initialize(repository, template_path: "CHANGELOG.md.erb", changelog_path: "CHANGELOG.md")
    @repository     = repository
    @template_path  = template_path
    @changelog_path = changelog_path
  end

  def generate_and_save!
    changelog_in_md   = ERB.new(template).result(binding)
    changelog_in_html = Octokit.markdown(changelog_in_md, context: repository, mode: "gfm")

    File.open(changelog_path, 'w') do |file|
      file.write ReverseMarkdown.convert(changelog_in_html, github_flavored: true)
    end
  end

  private

  def template
    open("#{__dir__}/#{template_path}").read
  end

  def releases
    @releases ||= Octokit.releases(repository)
  end
end

ChangeLogGenerator.new("yuki24/did_you_mean").generate_and_save!
