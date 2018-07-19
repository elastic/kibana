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

import React, { Fragment } from 'react';
import { getDocLink } from 'ui/documentation_links';

import {
  EuiCode,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const ScriptingSyntax = () => (
  <Fragment>
    <EuiSpacer />
    <EuiText>
      <h3>
        <FormattedMessage id="common.ui.fieldEditor.syntax.header" defaultMessage="Syntax"/>
      </h3>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.default.label.detail"
          defaultMessage="By default, Kibana scripted fields use {painless}, a simple and secure scripting language designed
          specifically for use with Elasticsearch, to access values in the document use the following format:"
          values={{
            painless: (
              <EuiLink
                target="_window"
                href={getDocLink('scriptedFields.painless')}
              >
                <FormattedMessage id="common.ui.fieldEditor.syntax.default.label.painless" defaultMessage="Painless" />&nbsp;
                <EuiIcon type="link" />
              </EuiLink>
            )
          }}
        />
      </p>
      <p>
        <EuiCode>
          <FormattedMessage id="common.ui.fieldEditor.syntax.default.format.label" defaultMessage="doc['some_field'].value"/>
        </EuiCode>
      </p>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.painless.label.detail"
          defaultMessage="Painless is powerful but easy to use. It provides access to many {javaAPIs}. Read up on its {syntax} and
          you'll be up to speed in no time!"
          values={{
            javaAPIs: (
              <EuiLink
                target="_window"
                href={getDocLink('scriptedFields.painlessApi')}
              >
                <FormattedMessage id="common.ui.fieldEditor.syntax.painless.label.javaAPIs" defaultMessage="native Java APIs" />&nbsp;
                <EuiIcon type="link" />
              </EuiLink>
            ),
            syntax: (
              <EuiLink
                target="_window"
                href={getDocLink('scriptedFields.painlessSyntax')}
              >
                <FormattedMessage id="common.ui.fieldEditor.syntax.painless.label.syntax" defaultMessage="syntax" />&nbsp;
                <EuiIcon type="link" />
              </EuiLink>
            )
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.kibana.label"
          defaultMessage="Kibana currently imposes one special limitation on the painless scripts you write. They cannot contain named
          functions."
        />
      </p>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.lucene.common.label.detail"
          defaultMessage="Coming from an older version of Kibana? The {lucene} you know and love are still available. Lucene expressions
          are a lot like JavaScript, but limited to basic arithmetic, bitwise and comparison operations."
          values={{
            lucene: (
              <EuiLink
                target="_window"
                href={getDocLink('scriptedFields.luceneExpressions')}
              >
                <FormattedMessage id="common.ui.fieldEditor.syntax.lucene.common.label.lucene" defaultMessage="Lucene Expressions" />
                &nbsp;<EuiIcon type="link" />
              </EuiLink>
            )
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.lucene.limits.label"
          defaultMessage="There are a few limitations when using Lucene Expressions:"
        />
      </p>
      <ul>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.limits.types.label"
            defaultMessage="Only numeric, boolean, date, and geo_point fields may be accessed"
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.limits.fields.label"
            defaultMessage="Stored fields are not available"
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.limits.sparse.label"
            defaultMessage="If a field is sparse (only some documents contain a value), documents missing the field will have
            a value of 0"
          />
        </li>
      </ul>
      <p>
        <FormattedMessage
          id="common.ui.fieldEditor.syntax.lucene.operations.label"
          defaultMessage="Here are all the operations available to lucene expressions:"
        />
      </p>
      <ul>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.arithmetic.label"
            defaultMessage="Arithmetic operators: {operators}"
            values={{ operators: <code>+ - * / %</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.bitwise.label"
            defaultMessage="Bitwise operators: {operators}"
            values={{ operators: <code>| & ^ ~ &#x3C;&#x3C; &#x3E;&#x3E; &#x3E;&#x3E;&#x3E;</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.boolean.label"
            defaultMessage="Boolean operators (including the ternary operator): {operators}"
            values={{ operators: <code>&& || ! ?:</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.comparison.label"
            defaultMessage="Comparison operators: {operators}"
            values={{ operators: <code>&#x3C; &#x3C;= == &#x3E;= &#x3E;</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.math.label"
            defaultMessage="Common mathematic functions: {operators}"
            values={{ operators: <code>abs ceil exp floor ln log10 logn max min sqrt pow</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.trig.label"
            defaultMessage="Trigonometric library functions: {operators}"
            values={{ operators: <code>acosh acos asinh asin atanh atan atan2 cosh cos sinh sin tanh tan</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.distance.label"
            defaultMessage="Distance functions: {operators}"
            values={{ operators: <code>haversin</code> }}
          />
        </li>
        <li>
          <FormattedMessage
            id="common.ui.fieldEditor.syntax.lucene.operations.miscellaneous.label"
            defaultMessage="Miscellaneous functions: {operators}"
            values={{ operators: <code>min, max</code> }}
          />
        </li>
      </ul>
    </EuiText>
  </Fragment>
);
