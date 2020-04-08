# this file is maven DSL

if ENV_JAVA['jars.quiet'] != 'true'
  model.dependencies.each do |d|
    puts '      ' + d.group_id + ':' + d.artifact_id + (d.classifier ? ':' + d.classifier : '') + ':' + d.version + ':' + (d.scope || 'compile')
    puts '          exclusions: ' + d.exclusions.collect { |e| e.group_id + ':' + e.artifact_id }.join unless d.exclusions.empty?
  end
end
