define([
  'ace',
  'autocomplete',
  'jquery',
  'mappings',
  'output',
  'sense_editor/editor',
  'settings',
  'require',
  'utils',
  'zeroclip',
  'ace_ext_searchbox'
], function (ace, Autocomplete, $, mappings, output, SenseEditor, settings, require, utils, ZeroClipboard) {
  'use strict';

  var input = new SenseEditor($('#editor'));

  input.autocomplete = new Autocomplete(input);

  input.$actions = $("#editor_actions");

  input.commands.addCommand({
    name: 'auto indent request',
    bindKey: {win: 'Ctrl-I', mac: 'Command-I'},
    exec: function () {
      input.autoIndent();
    }
  });
  input.commands.addCommand({
    name: 'move to previous request start or end',
    bindKey: {win: 'Ctrl-Up', mac: 'Command-Up'},
    exec: function () {
      input.moveToPreviousRequestEdge()
    }
  });
  input.commands.addCommand({
    name: 'move to next request start or end',
    bindKey: {win: 'Ctrl-Down', mac: 'Command-Down'},
    exec: function () {
      input.moveToNextRequestEdge()
    }
  });


  /**
   * COPY AS CURL
   *
   * Since the copy functionality is powered by a flash movie (via ZeroClipboard)
   * the only way to trigger the copy is with a litteral mouseclick from the user.
   *
   * The original shortcut will now just open the menu and highlight the
   *
   */
  var $copyAsCURL = $('#copy_as_curl');
  var zc = (function setupZeroClipboard() {
    ZeroClipboard.setDefaults({
      moviePath: require.toUrl("../vendor/zero_clipboard/zero_clipboard.swf"),
      debug: false
    });
    var zc = new ZeroClipboard($copyAsCURL); // the ZeroClipboard instance

    zc.on('wrongflash noflash', function () {
      if (!localStorage.getItem('flash_warning_shown')) {
        alert('Sense needs flash version 10.0 or greater in order to provide "Copy as cURL" functionality');
        localStorage.setItem('flash_warning_shown', 'true');
      }
      $copyAsCURL.hide();
    });

    zc.on('load', function () {
      function setupCopyButton(cb) {
        cb = typeof cb === 'function' ? cb : $.noop;
        $copyAsCURL.css('visibility', 'hidden');
        input.getCurrentRequestAsCURL(function (curl) {
          $copyAsCURL.attr('data-clipboard-text', curl);
          $copyAsCURL.css('visibility', 'visible');
          cb();
        });
      }

      input.$actions.on('mouseenter', function () {
        if (!$(this).hasClass('open')) {
          setupCopyButton();
        }
      });

// sadly this is blocked by browsers. Removed.
//      input.commands.addCommand({
//        name: 'copy as cUrl',
//        bindKey: {win: 'Ctrl-Shift-C', mac: 'Command-Shift-C'},
//        exec: function () {
//          input.$actions.find('[data-toggle=dropdown]:not(.open)').click();
//          setupCopyButton();
//          var toggles = 5;
//          (function toggle () {
//            $copyAsCURL.toggleClass('zeroclipboard-is-hover', toggles % 1);
//            if (--toggles) setTimeout(toggle, 125);
//          }());
//        }
//      });
    });

    zc.on('complete', function () {
      $copyAsCURL.click();
    });

    return zc;
  }());

  /**
   * Init the editor
   */
  if (settings) {
    settings.applyCurrentSettings(input);
  }
  input.focus();
  input.highlightCurrentRequestAndUpdateActionBar();
  input.updateActionsBar();

  return input;
});