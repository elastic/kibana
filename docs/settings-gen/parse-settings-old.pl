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

  # build the page preamble paragraphs
  my $page_description = $yaml->[0]->{page_description};
  my $page_description_string = "";
  for my $paragraph (@$page_description) {
    $page_description_string .= $paragraph."\n\n";
  }
  # remove the + sign after the last paragraph of the description
  if ($page_description_string) {
    $page_description_string =~ s/\+$//;
    chomp ($page_description_string);
  }
  if ($page_description_string) {
    $asciidocoutput .= $page_description_string;
  }




  my $groups = $yaml->[0]{groups};
  for my $group (@$groups) {

    # Grab the group name, description, and other properties
    my $group_id = $group->{group_id};
    my $group_name = $group->{group};
    my $group_description = $group->{description};
  
    # Add the group info to the asciidoc file contents
    $asciidocoutput .= "\n\n";
    $asciidocoutput .= "[float]\n[[".$group_id."]]\n=== ".$group_name."\n\n";
  
    # build the group preamble paragraphs
    my $group_description_string = "";
    for my $paragraph (@$group_description) {
      $group_description_string .= $paragraph."\n\n";
    }
    # remove the + sign after the last paragraph of the description
    if ($group_description_string) {
      $group_description_string =~ s/\+$//;
      chomp ($group_description_string);
    }
    if ($group_description_string) {
      $asciidocoutput .= $group_description_string;
    }

    my $settings = $group->{settings};
    for my $setting (@$settings) {
  
      # Grab the setting name, description, and other properties
      my $setting_name = $setting->{setting};
      my $setting_id = $setting->{id};
      my $setting_description = $setting->{description};
      my $setting_note = $setting->{note};
      my $setting_warning = $setting->{warning};
      my $setting_important = $setting->{important};
      my $setting_tip = $setting->{tip};
      my $setting_default = $setting->{default};
      my $setting_type = $setting->{type};
      my $setting_options = $setting->{options};
      my $setting_platforms = $setting->{platforms};
      my $setting_example = $setting->{example};
      my $setting_state = $setting->{state};
      my $setting_state_guidance = $setting->{state_guidance};

      # Get the setting options and option descriptions and build the string
      my $options = $setting->{options};
      my $setting_options_string = "";
      for my $option (@$options) {
        my $option_name = $option->{option};
        # if ($option_name) {print "\nOPTION = ".$option_name;}
        if ($option_name) {$setting_options_string .= '{nbsp} `'.$option_name.'`';}
        my $option_description = $option->{description};
        # if ($option_description) {print "\nDESCRIPTION = ".$option_description;}
        if ($option_description) {$setting_options_string .= ' - '.$option_description;}
        $setting_options_string .= ' +'."\n";
      }

      # check if supported on Cloud (these settings are marked with a Cloud icon)
      my $supported_cloud = 0;
      for my $platform (@$setting_platforms) {
        if ($platform =~ /cloud/) {$supported_cloud = 1;}
      }
  
      # build the description paragraphs
      my $setting_description_string = "";
      for my $paragraph (@$setting_description) {
        $setting_description_string .= $paragraph."\n".'+'."\n";
      }
      # remove the + sign after the last paragraph of the description
      if ($setting_description_string) {
        $setting_description_string =~ s/\+$//;
        chomp ($setting_description_string);
      }
  
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
      if ($supported_cloud) {
        $asciidocoutput .= ' {ess-icon}';
      }
      $asciidocoutput .= '::'."\n";
      if ($setting_state) {
        $asciidocoutput .= "+\n**".$setting_state.":** ";
        if ($setting_state_guidance) {
          $asciidocoutput .= $setting_state_guidance."\n+\n";
        }
      }
  
      if ($setting_description_string) {
        $asciidocoutput .= $setting_description_string;
      }
      if ($setting_note) {
        $asciidocoutput .= "+\nNOTE: ".$setting_note."\n";
      }
      if ($setting_warning) {
        $asciidocoutput .= "+\nWARNING: ".$setting_warning."\n";
      }
      if ($setting_important) {
        $asciidocoutput .= "+\nIMPORTANT: ".$setting_important."\n";
      }
      if ($setting_tip) {
        $asciidocoutput .= "+\nTIP: ".$setting_tip."\n";
      }
  
      # If any of these are defined (setting options, setting default value, settting type...) add those inside a box.
      # We put a " +" at the end of each line to to achieve single spacing inside the box.
  
      if (($setting_options_string) || ($setting_default) || ($setting_type)) {
        $asciidocoutput .= "+\n====\n";
  
        if ($setting_options_string) {
          $asciidocoutput .= "Options: +\n".$setting_options_string;
        }
        if ($setting_default) {
          $asciidocoutput .= "Default: ".'`'.$setting_default.'`'.' +'."\n";
        }
        # Removing this. Instead, settings supported on Cloud will be marked with the "C" icon.
        # if ($setting_platforms_string) {
        #   $asciidocoutput .= "+\nPlatforms: ".$setting_platforms_string."\n";
        # }
        if ($setting_type) {
          $asciidocoutput .= 'Type: `'.$setting_type.'` +'."\n";
        }
        $asciidocoutput .= "====\n";
      }
  
      # Add an example if there is one, like this:    include::../examples/example-logging-root-level.asciidoc[]
      if ($setting_example) {
        $asciidocoutput .= "+\n**Example**\n+\ninclude::../examples/".$setting_example."[]\n";
      }
    }
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

