/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import expect from '@kbn/expect';

import { ManagementSection } from '../section';
import { IndexedArray } from '../../indexed_array';

describe('ManagementSection', () => {
  describe('constructor', () => {
    it('defaults display to id', () => {
      const section = new ManagementSection('kibana');
      expect(section.display).to.be('kibana');
    });

    it('defaults visible to true', () => {
      const section = new ManagementSection('kibana');
      expect(section.visible).to.be(true);
    });

    it('defaults disabled to false', () => {
      const section = new ManagementSection('kibana');
      expect(section.disabled).to.be(false);
    });

    it('defaults tooltip to empty string', () => {
      const section = new ManagementSection('kibana');
      expect(section.tooltip).to.be('');
    });

    it('defaults url to empty string', () => {
      const section = new ManagementSection('kibana');
      expect(section.url).to.be('');
    });

    it('exposes items', () => {
      const section = new ManagementSection('kibana');
      expect(section.items).to.be.empty();
    });

    it('exposes visibleItems', () => {
      const section = new ManagementSection('kibana');
      expect(section.visibleItems).to.be.empty();
    });

    it('assigns all options', () => {
      const section = new ManagementSection('kibana', { description: 'test', url: 'foobar' });
      expect(section.description).to.be('test');
      expect(section.url).to.be('foobar');
    });
  });

  describe('register', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
    });

    it('returns a ManagementSection', () => {
      expect(section.register('about')).to.be.a(ManagementSection);
    });

    it('provides a reference to the parent', () => {
      expect(section.register('about').parent).to.be(section);
    });

    it('adds item', function () {
      section.register('about', { description: 'test' });

      expect(section.items).to.have.length(1);
      expect(section.items[0]).to.be.a(ManagementSection);
      expect(section.items[0].id).to.be('about');
    });

    it('can only register a section once', () => {
      let threwException = false;
      section.register('about');

      try {
        section.register('about');
      } catch (e) {
        threwException = e.message.indexOf('is already registered') > -1;
      }

      expect(threwException).to.be(true);
    });

    it('calls listener when item added', () => {
      let listerCalled = false;
      const listenerFn = () => { listerCalled = true; };

      section.addListener(listenerFn);
      section.register('about');
      expect(listerCalled).to.be(true);
    });
  });

  describe('deregister', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
      section.register('about');
    });

    it ('deregisters an existing section', () => {
      section.deregister('about');
      expect(section.items).to.have.length(0);
    });

    it ('allows deregistering a section more than once', () => {
      section.deregister('about');
      section.deregister('about');
      expect(section.items).to.have.length(0);
    });

    it('calls listener when item added', () => {
      let listerCalled = false;
      const listenerFn = () => { listerCalled = true; };

      section.addListener(listenerFn);
      section.deregister('about');
      expect(listerCalled).to.be(true);
    });
  });

  describe('getSection', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
      section.register('about');
    });

    it('returns registered section', () => {
      expect(section.getSection('about')).to.be.a(ManagementSection);
    });

    it('returns undefined if un-registered', () => {
      expect(section.getSection('unknown')).to.be(undefined);
    });

    it('returns sub-sections specified via a /-separated path', () => {
      section.getSection('about').register('time');
      expect(section.getSection('about/time')).to.be.a(ManagementSection);
      expect(section.getSection('about/time')).to.be(section.getSection('about').getSection('time'));
    });

    it('returns undefined if a sub-section along a /-separated path does not exist', () => {
      expect(section.getSection('about/damn/time')).to.be(undefined);
    });
  });

  describe('items', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');

      section.register('three', { order: 3 });
      section.register('one', { order: 1 });
      section.register('two', { order: 2 });
    });

    it('is an indexed array', () => {
      expect(section.items).to.be.a(IndexedArray);
    });

    it('is indexed on id', () => {
      const keys = Object.keys(section.items.byId).sort();
      expect(section.items.byId).to.be.an('object');

      expect(keys).to.eql(['one', 'three', 'two']);
    });

    it('can be ordered', () => {
      const ids = section.items.inOrder.map((i) => { return i.id; });
      expect(ids).to.eql(['one', 'two', 'three']);
    });
  });

  describe('visible', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
    });

    it('hide sets visible to false', () => {
      section.hide();
      expect(section.visible).to.be(false);
    });

    it('show sets visible to true', () => {
      section.hide();
      section.show();
      expect(section.visible).to.be(true);
    });
  });

  describe('disabled', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');
    });

    it('disable sets disabled to true', () => {
      section.disable();
      expect(section.disabled).to.be(true);
    });

    it('enable sets disabled to false', () => {
      section.enable();
      expect(section.disabled).to.be(false);
    });
  });

  describe('visibleItems', () => {
    let section;

    beforeEach(() => {
      section = new ManagementSection('kibana');

      section.register('three', { order: 3 });
      section.register('one', { order: 1 });
      section.register('two', { order: 2 });
    });

    it('maintains the order', () => {
      const ids = section.visibleItems.map((i) => { return i.id; });
      expect(ids).to.eql(['one', 'two', 'three']);
    });

    it('does not include hidden items', () => {
      section.getSection('two').hide();

      const ids = section.visibleItems.map((i) => { return i.id; });
      expect(ids).to.eql(['one', 'three']);
    });

  });
});
