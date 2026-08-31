#!/usr/bin/perl
use strict;
use warnings;
use YAML::Tiny;
use File::Find;
use File::Copy;

my $file;
# I'm hardcoding these directories just temporarily for testing
my $sourcedir = '/Users/kilfoyle/repos/kibana/docs/settings-yaml';
my $asciidocdir = '/Users/kilfoyle/repos/kibana/docs/settings-generated/';
my $count;

find(\&iteratefiles, $sourcedir);
print "\n\nProcessed ".$count. " files.\n";
exit;

sub iteratefiles {
  $file = $_;
  # ignore any non-yaml files
  if (!($file =~ /(\.yml)/)) {return;}
  print "\nParsing file = ".$file;
  my $testslice = parsefile($file);
return;
}

sub parsefile {
  # Create an output file based on yaml filename
  my $outputfile = $file;
  $outputfile =~ s/.yml/.asciidoc/g;
  # We'll use this to store the contents of the generated asciidoc file

  # Read in the yaml file
  my $yaml = YAML::Tiny->read( $file );

  # Get a reference to the first document
  #my $config = $yaml->[0];

  my $collection = $yaml->[0]->{collection};
  my $product = $yaml->[0]->{product};
  
  # This variable is used to capture all the content that will become our output asciidoc file
  my $asciidocoutput = "\n".'// '."This is a generated file. Please don't update it directly.";
  $asciidocoutput .= "\n".'// '."Collection: ".$collection;
  $asciidocoutput .= "\n".'// '."Product: ".$product."\n\n";

  my $settings = $yaml->[0]{settings};
  for my $setting (@$settings) {

    # Grab the setting name, description, and other properties
    my $setting_name = $setting->{setting};
    my $setting_id = $setting->{id};    
    my $setting_description_line1 = $setting->{description1};
    my $setting_description_line2 = $setting->{description2};
    my $setting_note = $setting->{note};
    my $setting_warning = $setting->{warning};
    my $setting_tip = $setting->{tip};
    my $setting_default = $setting->{default};
    my $setting_type = $setting->{type};
    my $setting_options = $setting->{options};
    my $setting_platforms = $setting->{platforms};
    my $setting_example = $setting->{example};

    #my $supported_cloud = 0;
    #for my $platform (@$setting_platforms) {
    #  if ($platform =~ /cloud/) {$supported_cloud = 1;}
    #}
    # build the list of supported options
    my $setting_options_string = "";
    for my $option (@$setting_options) {
      $setting_options_string .= '`'.$option.'`, ';
    }
    # remove the comma after the last option in the list
    if ($setting_options_string) {$setting_options_string =~ s/, $//;}
    # build the list of supported platforms
    my $setting_platforms_string = "";
    for my $platform (@$setting_platforms) {
      $setting_platforms_string .= '`'.$platform.'`, ';
    }
    # remove the comma after the last platform in the list
    if ($setting_platforms_string) {$setting_platforms_string =~ s/, $//;}


    # Add the settings info to the asciidoc file contents
    $asciidocoutput .= "\n";
    if ($setting_id) {
      $asciidocoutput .= "\n".'[['.$setting_id.']] ';
    }
    $asciidocoutput .= '`'.$setting_name.'`';
    #if ($supported_cloud) {
    #  $asciidocoutput .= ' {ess-icon}';
    #}
    $asciidocoutput .= '::'."\n";
    $asciidocoutput .= $setting_description_line1."\n";
    if ($setting_description_line2) {
      $asciidocoutput .= "+\n".$setting_description_line2."\n";
    }
    if ($setting_options_string) {
      $asciidocoutput .= "+\nOptions: ".$setting_options_string."\n";
    }
    if ($setting_default) {
      $asciidocoutput .= "+\nDefault: ".'`'.$setting_default.'`'."\n";
    }
    if ($setting_platforms_string) {
      $asciidocoutput .= "+\nPlatforms: ".$setting_platforms_string."\n";
    }
    if ($setting_type) {
      $asciidocoutput .= "+\nType: ".$setting_type."\n";
    }
    if ($setting_note) {
      $asciidocoutput .= "+\nNOTE: ".$setting_note."\n";
    }
    if ($setting_warning) {
      $asciidocoutput .= "+\nWARNING: ".$setting_warning."\n";
    }
    if ($setting_tip) {
      $asciidocoutput .= "+\nTIP: ".$setting_tip."\n";
    }


    # example include: include::../settings-examples/example-logging-root-level.asciidoc[]
    if ($setting_example) {
      $asciidocoutput .= "+\ninclude::../settings-examples/".$setting_example."[]\n";
    }
  }

  # Just in case we need to grab all of the keys, this is how:
  # foreach my $key (keys %hash) { ... }

  $asciidocoutput .= "\n\n";

  # write the contents into the generated asciidoc file
  my $outputfilefullpath = $asciidocdir.'/'.$outputfile;
  open (WRITE, "> $outputfilefullpath") or die("$!");
  print WRITE $asciidocoutput;
  close WRITE;
  ++$count;

return;
}



