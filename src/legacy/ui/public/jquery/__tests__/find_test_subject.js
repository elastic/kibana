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
import $ from 'jquery';

function $make(subject) {
  return $('<div>').attr('data-test-subj', subject);
}

describe('jQuery.findTestSubject', function () {
  it('finds all of the element with a subject', function () {
    const $container = $('<div>');
    const $match = $make('subject').appendTo($container);
    const $noMatch = $make('notSubject').appendTo($container);

    const $found = $container.findTestSubject('subject');
    expect($found.is($match)).to.be(true);
    expect($found.is($noMatch)).to.be(false);
  });

  it('finds multiple elements with a subject', function () {
    const $container = $('<div>');
    const $match = $make('subject').appendTo($container);
    const $otherMatch = $make('subject').appendTo($container);

    const $found = $container.findTestSubject('subject');
    expect($found.filter($match).length).to.be(1);
    expect($found.filter($otherMatch).length).to.be(1);
  });

  it('finds all of the elements with either subject', function () {
    const $container = $('<div>');
    const $match1 = $make('subject').appendTo($container);
    const $match2 = $make('alsoSubject').appendTo($container);
    const $noMatch = $make('notSubject').appendTo($container);

    const $found = $container.findTestSubject('subject', 'alsoSubject');
    expect($found.filter($match1).length).to.be(1);
    expect($found.filter($match2).length).to.be(1);
    expect($found.filter($noMatch).length).to.be(0);
  });

  it('finds all of the elements with a descendant selector', function () {
    const $container = $('<div>');
    const $parent = $make('foo name').appendTo($container);
    const $bar = $make('bar othername').appendTo($parent);
    const $baz = $make('baz third name').appendTo($parent);

    expect($container.findTestSubject('foo bar').is($bar)).to.be(true);
    expect($container.findTestSubject('foo bar').is($baz)).to.be(false);

    expect($container.findTestSubject('foo baz').is($bar)).to.be(false);
    expect($container.findTestSubject('foo baz').is($baz)).to.be(true);
  });

  it('finds elements with compound subjects', function () {
    const $container = $('<div>');
    const $bar = $make('button bar').appendTo($container);
    const $baz = $make('button baz').appendTo($container);

    expect($container.findTestSubject('button&bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button& bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button & bar').is($bar)).to.be(true);
    expect($container.findTestSubject('button &bar').is($bar)).to.be(true);

    expect($container.findTestSubject('button&baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button& baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button & baz').is($baz)).to.be(true);
    expect($container.findTestSubject('button &baz').is($baz)).to.be(true);
  });
});
