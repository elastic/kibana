## How do I contribute code? 
Welp, its going to be up to you to figure this one out, but you're going to have to get a dev environment going. Jump on IRC and we can help you with this! You'll find most functionality is related to functions and data sources, and adding those is pretty self explanitory.

## Cutting a release
I'm going to assume if you're reading this part, then you work at Elastic. Good for you. You will need:

1. gulp
1. `~/.aws-config.json` 

**Tip for Kibana 5.0+ releases**: You'll need to add the Kibana version you're targeting to `package.json` in the `kibanas` array. The build system will take care of assembling a working package for each version of Kibana, including naming the files correctly and updating each archive's `package.json` to match.

If you've sorted out that complex web of dependencies go ahead and run the following.

```
gulp release
```

You're done. Champagne? 
