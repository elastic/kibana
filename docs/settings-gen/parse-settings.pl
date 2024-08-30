#!/usr/bin/perl

# This little script finds any .yml files in the /source directory and, for each, generates an asciidoc file of the same name.
# The output asciidoc file is a set of tagged regions, one for each configuration setting in the yaml file.
# The tagged region can then be included in any Asciidoc file by means of an `include` statement. 
# Run the script with:   perl parse-settings.pl
# There are no parameters


use strict;
use warnings;
use YAML::Tiny;
use File::Find;
use File::Copy;

my $file;
# I'm hardcoding these directories just temporarily for testing
my $sourcedir = './source';
my $asciidocdir = 'source/';
my $count;

find(\&iteratefiles, $sourcedir);
print "\n\nProcessed ".$count. " files.\n";
exit;

sub iteratefiles {
  $file = $_;
  # ignore any non-yaml files
  if (!($file =~ /(\.yml)/)) {return;}
  print "\nParsed file: ".$file;
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
    my $setting_description_line3 = $setting->{description3};
    my $setting_description_line4 = $setting->{description4};
    my $setting_description_line5 = $setting->{description5};
    my $setting_description_line6 = $setting->{description6};
    my $setting_description_line7 = $setting->{description7};
    my $setting_description_line8 = $setting->{description8}; 
    my $setting_note = $setting->{note};
    my $setting_warning = $setting->{warning};
    my $setting_tip = $setting->{tip};
    my $setting_default = $setting->{default};
    my $setting_type = $setting->{type};
    my $setting_options = $setting->{options};
    my $setting_platforms = $setting->{platforms};
    my $setting_example = $setting->{example};
    my $setting_deprecated = $setting->{deprecated};
    my $setting_deprecated_guidance = $setting->{deprecated_guidance};

    # check if supported on Cloud (these settings are marked with a Cloud icon)
    my $supported_cloud = 0;
    for my $platform (@$setting_platforms) {
      if ($platform =~ /cloud/) {$supported_cloud = 1;}
    }
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
    # open the tagged region
    $asciidocoutput .= "\n".'// tag::'.$setting_name.'[]'."\n";
    if ($setting_id) {
      $asciidocoutput .= "\n".'[['.$setting_id.']] ';
    }
    $asciidocoutput .= '`'.$setting_name.'`';
    if ($supported_cloud) {
      $asciidocoutput .= ' {ess-icon}';
    }
    $asciidocoutput .= ' (**generated**)';
    $asciidocoutput .= '::'."\n";
    if ($setting_deprecated) {
      $asciidocoutput .= "+\n**Deprecated:** ".$setting_deprecated;
      if ($setting_deprecated_guidance) {
        $asciidocoutput .= " - ".$setting_deprecated_guidance."\n+\n";
      }
    }





    $asciidocoutput .= $setting_description_line1."\n";
    if ($setting_description_line2) {
      $asciidocoutput .= "+\n".$setting_description_line2."\n";
    }
    if ($setting_description_line3) {
      $asciidocoutput .= "+\n".$setting_description_line3."\n";
    }
    if ($setting_description_line4) {
      $asciidocoutput .= "+\n".$setting_description_line4."\n";
    }
    if ($setting_description_line5) {
      $asciidocoutput .= "+\n".$setting_description_line5."\n";
    }
    if ($setting_description_line6) {
      $asciidocoutput .= "+\n".$setting_description_line6."\n";
    }
    if ($setting_description_line7) {
      $asciidocoutput .= "+\n".$setting_description_line7."\n";
    }
    if ($setting_description_line8) {
      $asciidocoutput .= "+\n".$setting_description_line8."\n";
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

    # example include: include::../examples/example-logging-root-level.asciidoc[]
    if ($setting_example) {
      $asciidocoutput .= "+\n**Example**\n+\ninclude::../examples/".$setting_example."[]\n";
    }
    # close the tagged region
    $asciidocoutput .= '// end::'.$setting_name.'[]'."\n";
  }

  # Just in case we need to grab all of the keys, this is how:
  # foreach my $key (keys %hash) { ... }

  $asciidocoutput .= "\n\n";

  # write the contents into the generated asciidoc file
  open (WRITE, "> $outputfile") or die("$!");
  print WRITE $asciidocoutput;
  close WRITE;
  print "\nGenerated file: ".$outputfile;
  ++$count;

return;
}

