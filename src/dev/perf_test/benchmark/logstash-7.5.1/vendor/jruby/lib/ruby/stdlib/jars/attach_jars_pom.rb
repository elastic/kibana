# this file is maven DSL

(0..10_000).each do |i|
  coord = ENV_JAVA["jars.#{i}"]
  break unless coord
  artifact = Maven::Tools::Artifact.from_coordinate(coord)
  exclusions = []
  (0..10_000).each do |j|
    exclusion = ENV_JAVA["jars.#{i}.exclusions.#{j}"]
    break unless exclusion
    exclusions << exclusion
  end
  scope = ENV_JAVA["jars.#{i}.scope"]
  artifact.scope = scope if scope
  classifier = ENV_JAVA["jars.#{i}.classifier"]
  artifact.classifier = classifier if classifier

  # declare the artifact inside the POM
  dependency_artifact(artifact) do
    exclusions.each do |ex|
      exclusion ex
    end
  end
end
