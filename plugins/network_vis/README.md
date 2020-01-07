# Network Plugin for Kibana 5.5.X

This is a plugin developed for Kibana 5 that displays a network node that link two fields that have been previously selected.

###### Link to the page: https://dlumbrer.github.io/kbn_network/

## Installation Steps

```
cd KIBANA_HOME/plugins
git clone https://github.com/dlumbrer/kbn_network.git network_vis
cd network_vis
rm -rf images/
npm install
```
> **Important:** If you have any problem with the plugin version (like a warning message "**it expected Kibana version "5.5.0", and found "5.5.x"**") only change the value of the "version" tag on the package.json to your Kibana version


#### Uninstall:
```
cd KIBANA_HOME
rm -rf plugins/network_vis/
```

## Types of networks

#### Two types of Nodes:

It can select 'Node'-'Node' in buckets to show a network that link two types of nodes. Each type is the result of the field selected.

![Screenshot](images/Easy.png)

#### Nodes linked by a Relationship:

First, select 'Node' on buckets for build the network of one type of nodes, it depends of the field it has been selected. After, select 'Relation' to link the nodes through a relationship that depends of the field it has been selected.

![Screenshot](images/Types.png)

## Integration on Dashboard

Completly integration on Dashboards with other visualizations.

![Screenshot](images/Dashboard.png)

## User Guide

You can find an user guide in the file [USER_GUIDE.md](https://github.com/dlumbrer/kbn_network/blob/master/USER_GUIDE.md "Go to the user guide!")

## Help me to improve! :smile:

If there's any problem or doubt, please, open a Github Issue (Pull Request) or contact me via email (dmorenolumb@gmail.com). It would be very helpful if you tried it and tell me what you think of it, the errors and the possible improves that I could make.


#### For anything, contact me: dmorenolumb@gmail.com
