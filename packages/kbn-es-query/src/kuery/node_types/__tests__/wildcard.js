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
import * as wildcard from '../wildcard';

describe('kuery node types', function() {
  describe('wildcard', function() {
    describe('buildNode', function() {
      it('should accept a string argument representing a wildcard string', function() {
        const wildcardValue = `foo${wildcard.wildcardSymbol}bar`;
        const result = wildcard.buildNode(wildcardValue);
        expect(result).to.have.property('type', 'wildcard');
        expect(result).to.have.property('value', wildcardValue);
      });

      it('should accept and parse a wildcard string', function() {
        const result = wildcard.buildNode('foo*bar');
        expect(result).to.have.property('type', 'wildcard');
        expect(result.value).to.be(`foo${wildcard.wildcardSymbol}bar`);
      });
    });

    describe('toElasticsearchQuery', function() {
      it('should return the string representation of the wildcard literal', function() {
        const node = wildcard.buildNode('foo*bar');
        const result = wildcard.toElasticsearchQuery(node);
        expect(result).to.be('foo*bar');
      });
    });

    describe('toQueryStringQuery', function() {
      it('should return the string representation of the wildcard literal', function() {
        const node = wildcard.buildNode('foo*bar');
        const result = wildcard.toQueryStringQuery(node);
        expect(result).to.be('foo*bar');
      });

      it('should escape query_string query special characters other than wildcard', function() {
        const node = wildcard.buildNode('+foo*bar');
        const result = wildcard.toQueryStringQuery(node);
        expect(result).to.be('\\+foo*bar');
      });
    });

    describe('test', function() {
      it('should return a boolean indicating whether the string matches the given wildcard node', function() {
        const node = wildcard.buildNode('foo*bar');
        expect(wildcard.test(node, 'foobar')).to.be(true);
        expect(wildcard.test(node, 'foobazbar')).to.be(true);
        expect(wildcard.test(node, 'foobar')).to.be(true);

        expect(wildcard.test(node, 'fooqux')).to.be(false);
        expect(wildcard.test(node, 'bazbar')).to.be(false);
      });

      it('should return a true even when the string has newlines or tabs', function() {
        const node = wildcard.buildNode('foo*bar');
        expect(wildcard.test(node, 'foo\nbar')).to.be(true);
        expect(wildcard.test(node, 'foo\tbar')).to.be(true);
      });
    });

    describe('hasLeadingWildcard', function() {
      it('should determine whether a wildcard node contains a leading wildcard', function() {
        const node = wildcard.buildNode('foo*bar');
        expect(wildcard.hasLeadingWildcard(node)).to.be(false);

        const leadingWildcardNode = wildcard.buildNode('*foobar');
        expect(wildcard.hasLeadingWildcard(leadingWildcardNode)).to.be(true);
      });

      // Lone wildcards become exists queries, so we aren't worried about their performance
      it('should not consider a lone wildcard to be a leading wildcard', function() {
        const leadingWildcardNode = wildcard.buildNode('*');
        expect(wildcard.hasLeadingWildcard(leadingWildcardNode)).to.be(false);
      });
    });
  });
});
