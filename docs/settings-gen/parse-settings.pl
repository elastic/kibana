#!/usr/bin/perl

# This script takes all .yml files in the /source directory and, for each, generates an asciidoc file of the same name.
# Run the script:   perl parse-settings.pl

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
  if (!($file =~ /\.yml$/)) {return;}
  print "\nParsed file: ".$file;
  my $testslice = parsefile($file);
return;
}

sub parsefile {
  # Create an output file based on yaml filename
  my $outputfile = my $outputfileorig = $file;
  $outputfile =~ s/.yml/.asciidoc/g;
  # We'll use this to store the contents of the generated asciidoc file

  # Read in the yaml file
  my $yaml = YAML::Tiny->read( $file );

  # Get a reference to the first document
  #my $config = $yaml->[0];

  my $collection = $yaml->[0]->{collection};
  my $product = $yaml->[0]->{product};

  # This variable is used to capture all the content that will become our output asciidoc file
  my $asciidocoutput = "\n".'// '."This is a generated file; please don't update it directly.\n".'//'." Instead, the updatable source for these settings can be found in ".$outputfileorig;
  $asciidocoutput .= "\n".'// '."Collection: ".$collection;
  $asciidocoutput .= "\n".'// '."Product: ".$product."\n\n";

  # build the page preamble paragraphs
  my $page_description = $yaml->[0]->{page_description};
  if ($page_description) {
    # preserve newlines
    $page_description =~ s/\n/\n\n/g;
    $asciidocoutput .= $page_description;
  }

  my $groups = $yaml->[0]{groups};
  for my $group (@$groups) {

    # Grab the group name, description, and other properties
    my $group_id = $group->{id};
    my $group_name = $group->{group};
    my $group_description = $group->{description};
    my $group_example = $group->{example};
  
    # Add the group info to the asciidoc file contents
    $asciidocoutput .= "\n\n";
    if ($group_id) {
      $asciidocoutput .= "[float]\n[[".$group_id."]]\n=== ".$group_name."\n\n";
    }
    else {
      $asciidocoutput .= "[float]\n=== ".$group_name."\n\n";
    } 
    if ($group_description) {
      # preserve newlines
      $group_description =~ s/\n/\n\n/g;
      $asciidocoutput .= "\n$group_description\n";
    }


    # Add an example if there is one, like this:    include::../examples/example-logging-root-level.asciidoc[]
    if ($group_example) {
      $asciidocoutput .= "\n\n$group_example\n\n";
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
      my $setting_datatype = $setting->{datatype};
      my $setting_default = $setting->{default};
      my $setting_type = $setting->{type};
      my $setting_options = $setting->{options};
      my $setting_platforms = $setting->{platforms};
      my $setting_example = $setting->{example};
      my $setting_state = $setting->{state};
      my $deprecation_details = $setting->{deprecation_details};

      # skip settings that are flagged as "hidden" 
      if (($setting_state) && ($setting_state =~ /hidden/i)) {next;}

      # Get the setting options and option descriptions and build the string
      my $options = $setting->{options};
      my $setting_options_string = "";
      if ($options) {
      for my $option (@$options) {
        my $option_name = $option->{option};
        # if ($option_name) {print "\nOPTION = ".$option_name;}
        if ($option_name) {$setting_options_string .= '* `'.$option_name.'`';}
        my $option_description = $option->{description};
        # if ($option_description) {print "\nDESCRIPTION = ".$option_description;}
        if ($option_description) {$setting_options_string .= ' - '.$option_description;}
        $setting_options_string .= "\n";
      }
      }

      # check if supported on Cloud (these settings are marked with a Cloud icon)
      my $supported_cloud = 0;
      for my $platform (@$setting_platforms) {
        if ($platform =~ /cloud/) {$supported_cloud = 1;}
      }
  
      # Add the settings info to the asciidoc file contents
      $asciidocoutput .= "\n";
      if ($setting_id) {
        $asciidocoutput .= "\n".'[['.$setting_id.']]'."\n";
      }
      $asciidocoutput .= '`'.$setting_name.'`';
      if ($supported_cloud) {
        $asciidocoutput .= ' {ess-icon}';
      }
      $asciidocoutput .= "::\n+\n====\n";

      if ($setting_state) {
        # Add a standard disclaimer for technical preview settings
        if ($setting_state =~ /technical-preview/i) 
          {
            $asciidocoutput .= "\n\npreview::[]\n\n";
          }

        # Mark deprecated settings and add guidance (such as when it was deprecated) if there is any
        elsif ($setting_state =~ /deprecated/i) 
          {
            $asciidocoutput .= "**Deprecated:** ";
            if ($deprecation_details) {
            $asciidocoutput .= $deprecation_details."\n\n";
          }
          }
        # known setting_states are 'technical-preview', 'deprecated' and 'hidden'. Anything else is ignored.
        else {
          print "\nUnknown setting state: ".$setting_state."\n";
        }
      }

      #if ($setting_description_string) {
      #  $asciidocoutput .= $setting_description_string;
      #}
      if ($setting_description) {
        # preserve newlines
        $setting_description =~ s/\n/\n\n/g;
        $asciidocoutput .= "$setting_description";
      }

      if ($setting_note) {
        $asciidocoutput .= "\nNOTE: ".$setting_note."\n";
      }
      if ($setting_warning) {
        $asciidocoutput .= "\nWARNING: ".$setting_warning."\n";
      }
      if ($setting_important) {
        $asciidocoutput .= "\nIMPORTANT: ".$setting_important."\n";
      }
      if ($setting_tip) {
        $asciidocoutput .= "\nTIP: ".$setting_tip."\n";
      }
  
      # If any of these are defined (setting options, setting default value, settting type...) add those inside a box.
      # We put a " +" at the end of each line to to achieve single spacing inside the box.
  
      if (($setting_options_string) || ($setting_datatype) || ($setting_default) || ($setting_type)) {
        if ($setting_datatype) {
          $asciidocoutput .= "Data type: ".'`'.$setting_datatype.'`'.' +'."\n";
        }
        if ($setting_options_string) {
          $asciidocoutput .= "\nOptions:\n\n".$setting_options_string."\n";
        }
        if ($setting_default) {
          $asciidocoutput .= "Default: ".'`'.$setting_default.'`'.' +'."\n";
        }
        if ($setting_type) {
          $asciidocoutput .= 'Type: `'.$setting_type.'` +'."\n";
        }
      }

      # Add an example if there is one, like this:    include::../examples/example-logging-root-level.asciidoc[]
      if ($setting_example) {
        $asciidocoutput .= "\n\n$setting_example\n\n";
      }

      $asciidocoutput .= "====\n";
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

