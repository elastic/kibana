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
import { highlightTags } from '../highlight_tags';
import { htmlTags } from '../html_tags';
import { getHighlightHtml } from '../highlight_html';

describe('getHighlightHtml', function () {
  const text = '' +
    'Bacon ipsum dolor amet pork loin pork cow pig beef chuck ground round shankle sirloin landjaeger kevin ' +
    'venison sausage ribeye tongue. Chicken bacon ball tip pork. Brisket pork capicola spare ribs pastrami rump ' +
    'sirloin, t-bone ham shoulder jerky turducken bresaola. Chicken cow beef picanha. Picanha hamburger alcatra ' +
    'cupim. Salami capicola boudin pork belly shank picanha.';

  it('should not modify text if highlight is empty', function () {
    expect(getHighlightHtml(text, undefined)).to.be(text);
    expect(getHighlightHtml(text, null)).to.be(text);
    expect(getHighlightHtml(text, [])).to.be(text);
  });

  it('should preserve escaped text', function () {
    const highlights = ['<foo>'];
    const result = getHighlightHtml('&lt;foo&gt;', highlights);
    expect(result.indexOf('<foo>')).to.be(-1);
    expect(result.indexOf('&lt;foo&gt;')).to.be.greaterThan(-1);
  });

  it('should highlight a single result', function () {
    const highlights = [
      highlightTags.pre + 'hamburger' + highlightTags.post + ' alcatra cupim. Salami capicola boudin pork belly shank picanha.'
    ];
    const result = getHighlightHtml(text, highlights);
    expect(result.indexOf(htmlTags.pre + 'hamburger' + htmlTags.post)).to.be.greaterThan(-1);
    expect(result.split(htmlTags.pre + 'hamburger' + htmlTags.post).length).to.be(text.split('hamburger').length);
  });

  it('should highlight multiple results', function () {
    const highlights = [
      'kevin venison sausage ribeye tongue. ' + highlightTags.pre + 'Chicken' + highlightTags.post + ' bacon ball tip pork. Brisket ' +
      'pork capicola spare ribs pastrami rump sirloin, t-bone ham shoulder jerky turducken bresaola. ' + highlightTags.pre +
      'Chicken' + highlightTags.post + ' cow beef picanha. Picanha'
    ];
    const result = getHighlightHtml(text, highlights);
    expect(result.indexOf(htmlTags.pre + 'Chicken' + htmlTags.post)).to.be.greaterThan(-1);
    expect(result.split(htmlTags.pre + 'Chicken' + htmlTags.post).length).to.be(text.split('Chicken').length);
  });

  it('should highlight multiple hits in a result', function () {
    const highlights = [
      'Bacon ipsum dolor amet ' + highlightTags.pre + 'pork' + highlightTags.post + ' loin ' +
        '' + highlightTags.pre + 'pork' + highlightTags.post + ' cow pig beef chuck ground round shankle ' +
        'sirloin landjaeger',
      'kevin venison sausage ribeye tongue. Chicken bacon ball tip ' +
        '' + highlightTags.pre + 'pork' + highlightTags.post + '. Brisket ' +
        '' + highlightTags.pre + 'pork' + highlightTags.post + ' capicola spare ribs',
      'hamburger alcatra cupim. Salami capicola boudin ' + highlightTags.pre + 'pork' + highlightTags.post + ' ' +
        'belly shank picanha.'
    ];
    const result = getHighlightHtml(text, highlights);
    expect(result.indexOf(htmlTags.pre + 'pork' + htmlTags.post)).to.be.greaterThan(-1);
    expect(result.split(htmlTags.pre + 'pork' + htmlTags.post).length).to.be(text.split('pork').length);
  });

  it('should accept an object and return a string containing its properties', function () {
    const obj = { foo: 1, bar: 2 };
    const result = getHighlightHtml(obj, null);
    expect(result.indexOf('' + obj)).to.be(-1);
    expect(result.indexOf('foo')).to.be.greaterThan(-1);
    expect(result.indexOf('bar')).to.be.greaterThan(-1);
  });
});
