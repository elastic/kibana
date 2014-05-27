define(function (require) {
  'use strict';

  var statsReportURL = '@@stats_report_url';
  var registrationUrl = '@@registration_url';
  var purchaseConfirmationUrl = '@@purchase_confirmation_url';
  var _ = require('lodash');
  var $ = require("jquery");

  function PhoneHome (options) {
    this._id = options._id || 'marvelOpts';
    this._type = options._type || 'appdata';
    this.client = options.client || $;
    this.baseUrl = options.baseUrl;
    this.index = options.index;
    // set defaults
    this.attributes = {
      report: true,
      status: 'trial'
    }; 
    this.events = {};
    this.currentBaseUrl = this.baseUrl;

    this.fieldsToES= [
      'registrationData',
      'status',
      'version',
      'report'
    ];

    this.fieldsToBrowser = [
      'trialTimestamp',
      'lastReport',
      'registrationSent',
      'report',
      'status'
    ];

    var self = this;
    this.on('change:data', function (data) {
      self.sendIfDue(data);    
      self.checkAndSendRegistrationData();    
    });
  }

  PhoneHome.prototype = {

    on: function (id, cb) {
      if (!_.isArray(this.events[id])) {
        this.events[id] = [];
      }
      this.events[id].push(cb);
    }, 

    clear: function (id) {
      delete this.events[id];
    },

    trigger: function () {
      var args = Array.prototype.slice.call(arguments);
      var id = args.shift();
      if (this.events[id]) {
        _.each(this.events[id], function (cb) {
          cb.apply(null, args);
        });
      }
    },

    setBaseUrl: function (url) {
      this.baseUrl = url;
    },

    set: function (key, value) {
      var self = this;
      var previous;
      if (typeof(key) === 'object') {
        previous = _.pick(this.attributes, _.keys(key));
        this.attributes = _.assign(this.attributes, key);
        _.each(key, function (value, name) {
          self.trigger('change:'+name, value, previous[name]);
        });
      } else {
        previous = this.attributes[key];
        this.attributes[key] = value;
        this.trigger('change:'+key, value, previous);
      }
    },

    get: function (key) {
      if (_.isUndefined(key)) {
        return this.attributes;
      } else {
        return this.attributes[key];
      }
    },

    setTrialTimestamp: function (timestamp) {
      this.set('trialTimestamp', timestamp);
      this.saveToBrowser();
    },

    saveToES: function () {
      var data = _.pick(this.attributes, this.fieldsToES);
      var url = this.baseUrl+'/'+this.index+'/'+this._type+'/'+this._id;
      return this.client.put(url, data);
    },

    saveToBrowser: function () {
      var data = _.pick(this.attributes, this.fieldsToBrowser);
      localStorage.setItem(this._id, JSON.stringify(data));
    },

    saveAll: function () {
      this.saveToBrowser();
      return this.saveToES();
    },

    destroy: function () {
      var url = this.baseUrl+'/'+this.index+'/'+this._type+'/'+this._id;
      localStorage.removeItem(this._id);
      return this.client.delete(url);
    },

    checkReportStatus: function () {
      var reportInterval = 86400000;
      var sendReport     = false;

      // Check to see if the currentBaseUrl is set along with if it has changed
      // since the last time we checked.
      var urlChanged = (!_.isEmpty(this.currentBaseUrl) && (this.currentBaseUrl !== this.baseUrl));    
      this.currentBaseUrl = this.baseUrl;

      if (this.get('version') && this.get('report')) {
        // if the URL changes we need to send what we can
        if (urlChanged) {
          sendReport = true;
        }
        // If the last report is empty it means we've never sent an report and
        // now is the time to send it.
        if (!this.get('lastReport')) {
          sendReport = true;
        }
        // If it's been a day since we last sent an report, send one.
        if (new Date().getTime() - parseInt(this.get('lastReport'), 10) > reportInterval) {
          sendReport = true;
        }
      }

      // If we need to send a report then we need to record the last time we
      // sent it and store it
      if (sendReport) {
        return true;
      }

      // If all else fails... don't send
      return false;
    },

    checkRegistratonStatus: function () {
      var regTimeout = (86400000*7); // 7 days
      // Calculate if the registration is due
      var regDue = (new Date().getTime() - parseInt(this.get('trialTimestamp'), 10) > regTimeout);
      // if the user is not registers and they haven't purchased and it's been 7 days
      // since we displayed the welcome screen then force registration.
      return (this.get('status') === 'trial' && regDue);
    },

    sendIfDue: function (data) {
      var self = this;
      if (this.checkReportStatus()) {
        return this.client.post(statsReportURL, data).then(function () {
          self.set('lastReport', new Date().getTime());
          self.saveToBrowser();
        });
      }
    },

    register: function (data) {
      var self = this;
      this.set('registrationData', data);
      this.set('status', 'registered');
      self.saveToBrowser();
      return self.saveToES();
    },

    confirmPurchase: function (data) {
      var self = this;
      this.set('registrationData', data);
      this.set('status', 'purchased');
      this.set('registrationSent', false);
      self.saveToBrowser();
      return self.saveToES();
    },

    checkAndSendRegistrationData: function () {
      var self = this;
      var regData;
      var registrationData = this.get('registrationData');
      var data = this.get('data');
      var url = registrationUrl; 

      if (!this.get('registrationSent') && registrationData && data && data.uuid ) {
        registrationData.uuid = data.uuid;

        if (this.get('status') === 'purchased') {
          url = purchaseConfirmationUrl;
        }

        return this.client.post(url, registrationData).then(function () {
          self.set('registrationSent', true);
          self.saveToBrowser();
        });
      }
    },

    fetch: function () {
      var data, self = this;

      try {
        data = JSON.parse(localStorage.getItem(self._id));
        this.set(data);
      } catch (err) { 
        // do nothing
      }

      var url = this.baseUrl+'/'+this.index+'/'+this._type+'/'+this._id;
      return this.client.get(url).then(function (resp) {
        self.set(resp.data._source);
        self.saveToBrowser();
        return self.attributes;
      });
    }

  };

  return PhoneHome;

});
