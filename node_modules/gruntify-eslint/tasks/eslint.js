var path = require("path");

module.exports = function(grunt){
    grunt.registerMultiTask("eslint", "Validate files with ESLint", function(){
        var CLIEngine = require("eslint").CLIEngine;
        var eslint;
        var response;
        var formatter;
        var report;
        var options = this.options({
            "silent": false,
            "quiet": false,
            "format": "stylish",
            "callback": "false"
        });

        if(this.filesSrc.length === 0){
            return console.log("No Files specified");
        }

        try{
            eslint = new CLIEngine(options);
            response = eslint.executeOnFiles(this.filesSrc);
        }
        catch(err){
            grunt.warn(err);
            return;
        }

        if(options.callback && options.callback.constructor === Function){
            return options.callback(response);
        }

        formatter = eslint.getFormatter(options.format);

        if (!formatter) {
            grunt.warn("Formatter " + options.format + " not found");
            return;
        }

        if (options.quiet) {
            response.results = CLIEngine.getErrorResults(response.results);
        }

        report = formatter(response.results);

        console.log(report);

        if(options.silent){
            return true;
        }
        else{
            return response.errorCount === 0;
        }
    });
};
