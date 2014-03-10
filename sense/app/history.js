define([
  '_',
  'sense_editor/editor',
  'jquery',
  'moment',
  'settings'
], function (_, SenseEditor, $, moment) {
  'use strict';

  function History() {
    var $historyPopup = $("#history_popup");
    var historyViewer;
    var self = this;
    function restoreNotImplemented() {
      // default method for history.restoreFromHistory
      // replace externally to do something when the user chooses
      // to relive a bit of history
      throw new Error('not implemented');
    }

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
      historyViewer.setValue(s);
      historyViewer.clearSelection();
    }

    function addToHistory(server, endpoint, method, data) {
      var keys = getHistoryKeys();
      keys.splice(0, 500); // only maintain most recent X;
      $.each(keys, function (i, k) {
        localStorage.removeItem(k);
      });

      var timestamp = new Date().getTime();
      var k = "hist_elem_" + timestamp;
      localStorage.setItem(k, JSON.stringify({
        time: timestamp,
        server: server,
        endpoint: endpoint,
        method: method,
        data: data
      }));
    }

    function updateCurrentState(server, content) {
      var timestamp = new Date().getTime();
      localStorage.setItem("editor_state", JSON.stringify(
        { 'time': timestamp, 'server': server, 'content': content })
      );
    }

    function getSavedEditorState(server, content) {
      return JSON.parse(localStorage.getItem("editor_state"));
    }

    $historyPopup.on('show', function () {
      $historyPopup.find("#history_viewer").append('<div id="history_viewer_editor">No history available</div>');

      historyViewer = new SenseEditor($("#history_viewer_editor"));
      historyViewer.setReadOnly(true);
      historyViewer.renderer.setShowPrintMargin(false);
      require('settings').applyCurrentSettings(historyViewer);

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
          $historyPopup.find('.modal-body .nav li').removeClass("active");
          li.addClass("active");
          populateHistElem(hist_elem);
          return false;
        });

        li.dblclick(function () {
          li.addClass("active");
          $historyPopup.find(".btn-primary").click();
        });

        li.hover(function () {
          populateHistElem(hist_elem);
          return false;
        }, function () {
          $historyPopup.find(".modal-body .nav li.active a").click();
        });

        li.bind('apply', function () {
          self.restoreFromHistory(hist_elem);
        });

        li.appendTo($historyPopup.find(".modal-body .nav"));
      });

      $historyPopup.find(".modal-body .nav li:first a").click();
    });

    $historyPopup.on('hidden', function () {
      $historyPopup.find('.modal-body #historyViewer').remove();
      $historyPopup.find('.modal-body .nav li').remove();
      historyViewer = null;
    });

    $historyPopup.find(".btn-primary").click(function () {
      $historyPopup.find(".modal-body .nav li.active").trigger("apply");
    });

    $historyPopup.find("#hist_clear").click(function () {
      var keys = getHistoryKeys();
      $.each(keys, function (i, k) {
        localStorage.removeItem(k);
      });
      $historyPopup.find(".modal-body .nav").html("");
      historyViewer.getSession().setValue("No history available");
    });

    _.assign(this, {
      updateCurrentState: updateCurrentState,
      addToHistory: addToHistory,
      getSavedEditorState: getSavedEditorState,
      getHistoricalServers: getHistoricalServers,
      restoreFromHistory: restoreNotImplemented
    });
  }

  return new History();
});





