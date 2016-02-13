import angular from 'angular';
import _ from 'lodash';
import expect from 'expect.js';
import ngMock from 'ngMock';
import 'ui/filters/capitalize';

let filter;

const titles = [
  'capitalize',
  'saved searches',
  'an awesome visualization',
  'saved searches of the tenth degree',
  'the title'
];

const notAString = 10;

const init = function (expandable) {
  // Load the application
  ngMock.module('kibana');

  // Create the scope
  ngMock.inject(function ($filter) {
    filter = $filter('capitalize');
  });
};

describe('capitalize filter', function () {

  beforeEach(function () {
    init();
  });

  it('should have a capitalize filter', function () {
    expect(filter).to.not.be(null);
  });

  it('should simply return non-string types as is', function () {
    expect(filter(notAString)).to.be(notAString);
  });

  titles.forEach((title) => {
    const nonCapitalizedWords = filter.nonCapitalizedWords();
    const titleString = filter(title);
    const splitTitleString = titleString.split(' ');

    it('should always capitalize the first letter of the first word of a title', function () {
      expect(titleString.charAt(0)).to.be(title.chartAt(0).toUpperCase());
    });

    it('should capitalize the first letter of a qualified string', function () {
      splitTitleString.forEach((word) => {
        if (_.indexOf(nonCapitalizedWords, word) === -1) {
          expect(word.charAt(0)).to.be(word.charAt(0).toUpperCase());
        }
      });
    });

    it('should not capitalize certain words', function () {
      splitTitleString.forEach((word) => {
        if (_.indexOf(nonCapitalizedWords, word) !== -1) {
          expect(word.charAt(0)).to.be(word.charAt(0).toLowerCase());
        }
      });
    });

    it('should not be a trailing space at the end of words', function () {
      expect(titleString.charAt(titleString.length - 1)).to.not.be(' ');
    });
  });
});
