import expect from 'expect.js';
import { getCategoryName } from '../get_category_name';

describe('Settings', function () {
  describe('Advanced', function () {
    describe('getCategoryName(category)', function () {
      it('should be a function', function () {
        expect(getCategoryName).to.be.a(Function);
      });

      it('should return correct name for known categories', function () {
        expect(getCategoryName('general')).to.be('General');
        expect(getCategoryName('timelion')).to.be('Timelion');
        expect(getCategoryName('notifications')).to.be('Notifications');
        expect(getCategoryName('visualizations')).to.be('Visualizations');
        expect(getCategoryName('discover')).to.be('Discover');
        expect(getCategoryName('dashboard')).to.be('Dashboard');
        expect(getCategoryName('reporting')).to.be('Reporting');
        expect(getCategoryName('search')).to.be('Search');
      });

      it('should capitalize unknown category', function () {
        expect(getCategoryName('elasticsearch')).to.be('Elasticsearch');
      });

      it('should return empty string for no category', function () {
        expect(getCategoryName()).to.be('');
        expect(getCategoryName('')).to.be('');
        expect(getCategoryName(false)).to.be('');
      });
    });
  });
});
