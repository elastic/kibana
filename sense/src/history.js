(function () {

   var global = window;

   var history_viewer, history_popup;

   function getHistoryKeys() {
      var keys = [];
      for (var i = 0; i < localStorage.length; i++) {
         var k = localStorage.key(i);
         if (k.indexOf("hist_elem") == 0) {
            keys.push(k);
         }
      }

      keys.sort();
      keys.reverse();
      return keys;
   }

   function getHistory() {
      var hist_items = [];
      $.each(getHistoryKeys(), function (i, key) {
         hist_items.push(JSON.parse(localStorage.getItem(key)));
      });

      return hist_items;
   }

   function getHistoricalServers() {
      var servers = {};
      $.each(getHistory(), function (i, h) {
         servers[h.server] = 1;
      });

      var server_list = [];
      for (var s in servers) server_list.push(s);

      return server_list;
   }

   function populateHistElem(hist_elem) {
      var s = hist_elem.method + " " + hist_elem.endpoint + "\n" + (hist_elem.data || "");
      history_viewer.setValue(s);
      history_viewer.clearSelection();
   }

   function applyHistElem(hist_elem) {
      var session = sense.editor.getSession();
      var pos = sense.editor.getCursorPosition();
      var prefix = "";
      var suffix = "\n";
      if (sense.utils.isStartRequestRow(pos.row)) {
         pos.column = 0;
         suffix += "\n";
      }
      else if (sense.utils.isEndRequestRow(pos.row)) {
         var line = session.getLine(pos.row);
         pos.column = line.length;
         prefix = "\n\n";
      }
      else if (sense.utils.isInBetweenRequestsRow(pos.row)) {
         pos.column = 0;
      }
      else {
         pos = sense.utils.nextRequestEnd(pos);
         prefix = "\n\n";
      }

      var s = prefix + hist_elem.method + " " + hist_elem.endpoint;
      if (hist_elem.data) s += "\n" + hist_elem.data;

      s += suffix;

      session.insert(pos, s);
      sense.editor.clearSelection();
      sense.editor.moveCursorTo(pos.row + prefix.length, 0);
      sense.editor.focus();
   }

   function init() {

      history_popup = $("#history_popup");


      history_popup.on('shown', function () {
         $('<div id="history_viewer">No history available</div>').appendTo(history_popup.find(".modal-body"));

         history_viewer = ace.edit("history_viewer");
         history_viewer.getSession().setMode("ace/mode/sense");
//         history_viewer.setTheme("ace/theme/monokai");
         history_viewer.getSession().setFoldStyle('markbeginend');
         history_viewer.setReadOnly(true);
         history_viewer.renderer.setShowPrintMargin(false);
         sense.editor.getSession().setUseWrapMode(true);

         $.each(getHistory(), function (i, hist_elem) {
            var li = $('<li><a href="#"><i class="icon-chevron-right"></i><span/></a></li>');
            var disc = hist_elem.endpoint;
            var date = moment(hist_elem.time);
            if (date.diff(moment(), "days") < -7)
               disc += " (" + date.format("MMM D") + ")";
            else
               disc += " (" + date.fromNow() + ")";

            li.find("span").text(disc);
            li.attr("title", disc);

            li.find("a").click(function () {
               history_popup.find('.modal-body .nav li').removeClass("active");
               li.addClass("active");
               populateHistElem(hist_elem);
               return false;
            });

            li.dblclick(function () {
               li.addClass("active");
               history_popup.find(".btn-primary").click();
            });

            li.hover(function () {
               populateHistElem(hist_elem);
               return false;
            }, function () {
               history_popup.find(".modal-body .nav li.active a").click();
            });

            li.bind('apply', function () {
               _gaq.push(['_trackEvent', "history", 'applied']);
               applyHistElem(hist_elem);
            });


            li.appendTo(history_popup.find(".modal-body .nav"));
         });

         history_popup.find(".modal-body .nav li:first a").click();

      });

      history_popup.on('hidden', function () {
         history_popup.find('.modal-body #history_viewer').remove();
         history_popup.find('.modal-body .nav li').remove();
         history_viewer = null;
      });

      history_popup.find(".btn-primary").click(function () {
         history_popup.find(".modal-body .nav li.active").trigger("apply");
      });

      history_popup.find("#hist_clear").click(function () {
         var keys = getHistoryKeys();
         $.each(keys, function (i, k) {
            localStorage.removeItem(k);
         });
         history_popup.find(".modal-body .nav").html("");
         history_viewer.getSession().setValue("No history available");
      })

   }

   function addToHistory(server, endpoint, method, data) {
      var keys = getHistoryKeys();
      keys.splice(0, 500); // only maintain most recent X;
      $.each(keys, function (i, k) {
         localStorage.removeItem(k);
      });

      var timestamp = new Date().getTime();
      var k = "hist_elem_" + timestamp;
      localStorage.setItem(k, JSON.stringify(
         { 'time': timestamp, 'server': server, 'endpoint': endpoint, 'method': method, 'data': data }));
   }

   function saveCurrentEditorState(server, content) {
      var timestamp = new Date().getTime();
      localStorage.setItem("editor_state", JSON.stringify(
         { 'time': timestamp, 'server': server, 'content': content }));

   }

   function getSavedEditorState(server, content) {
      return JSON.parse(localStorage.getItem("editor_state"));
   }

   global.sense.history = {
      init: init,
      addToHistory: addToHistory,
      getHistoricalServers: getHistoricalServers,
      saveCurrentEditorState: saveCurrentEditorState,
      getSavedEditorState: getSavedEditorState
   };

})();





