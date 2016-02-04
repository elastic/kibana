var modules = require('ui/modules');
var template = require('plugins/kibana/settings/sections/indices/add_data_steps/paste_samples_step.html');

modules.get('apps/settings')
  .directive('pasteSamplesStep', function () {
    return {
      template: template,
      scope: {
        samples: '='
      },
      controller: function ($scope) {
        const fileData =
`64.242.88.10 - - [07/Mar/2004:16:47:12 -0800] "GET /robots.txt HTTP/1.1" 200 68
64.242.88.10 - - [07/Mar/2004:16:47:46 -0800] "GET /bin/rdiff/Know/ReadmeFirst?rev1=1.5&rev2=1.4 HTTP/1.1" 200 5724
64.242.88.10 - - [07/Mar/2004:16:49:04 -0800] "GET /twiki/bin/view/Main/TWikiGroups?rev=1.2 HTTP/1.1" 200 5162
64.242.88.10 - - [07/Mar/2004:16:50:54 -0800] "GET /twiki/bin/rdiff/Main/ConfigurationVariables HTTP/1.1" 200 59679
64.242.88.10 - - [07/Mar/2004:16:53:46 -0800] "GET /twiki/bin/rdiff/TWiki/TWikiRegistration HTTP/1.1" 200 34395
64.242.88.10 - - [07/Mar/2004:16:54:55 -0800] "GET /twiki/bin/rdiff/Main/NicholasLee HTTP/1.1" 200 7235
64.242.88.10 - - [07/Mar/2004:16:56:39 -0800] "GET /twiki/bin/view/Sandbox/WebHome?rev=1.6 HTTP/1.1" 200 8545
64.242.88.10 - - [07/Mar/2004:16:58:54 -0800] "GET /mailman/listinfo/administration HTTP/1.1" 200 6459
lordgun.org - - [07/Mar/2004:17:01:53 -0800] "GET /razor.html HTTP/1.1" 200 2869
lj1036.inktomisearch.com - - [07/Mar/2004:17:18:36 -0800] "GET /robots.txt HTTP/1.0" 200 68
lj1090.inktomisearch.com - - [07/Mar/2004:17:18:41 -0800] "GET /twiki/bin/view/Main/LondonOffice HTTP/1.0" 200 3860
64.242.88.10 - - [07/Mar/2004:17:21:44 -0800] "GET /twiki/bin/attach/TWiki/TablePlugin HTTP/1.1" 401 12846
64.242.88.10 - - [07/Mar/2004:17:22:49 -0800] "GET /twiki/bin/view/TWiki/ManagingWebs?rev=1.22 HTTP/1.1" 200 9310
64.242.88.10 - - [07/Mar/2004:17:23:54 -0800] "GET /twiki/bin/statistics/Main HTTP/1.1" 200 808
64.242.88.10 - - [07/Mar/2004:17:26:30 -0800] "GET /twiki/bin/view/TWiki/WikiCulture HTTP/1.1" 200 5935
64.242.88.10 - - [07/Mar/2004:17:27:37 -0800] "GET /twiki/bin/edit/Main/WebSearch?t=1078669682 HTTP/1.1" 401 12846
64.242.88.10 - - [07/Mar/2004:17:28:45 -0800] "GET /ResetPassword?template=oopsmore¶m1=1.4¶m2=1.4 HTTP/1.1" 200 11281
64.242.88.10 - - [07/Mar/2004:17:29:59 -0800] "GET /twiki/bin/view/TWiki/ManagingWebs?skin=print HTTP/1.1" 200 8806
64.242.88.10 - - [07/Mar/2004:17:31:39 -0800] "GET /UvscanAndPostFix?topicparent=Main.WebHome HTTP/1.1" 401 12846`;

        const samples = fileData.split('\n').map((line) => {
          return {
            'message': line
          };
        });

        $scope.updateData = function () {
          $scope.samples = samples;
        };

      }
    };
  });
