/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiCode,
  EuiCodeBlock,
  EuiLink,
  EuiPage,
  EuiPageBody,
  EuiPageContent,
  EuiPageContentBody,
  EuiPageHeader,
  EuiPageHeaderSection,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FieldFormatsStart } from '../../../src/plugins/field_formats/public';
import * as example1 from './examples/1_using_existing_format';
import * as example2 from './examples/2_creating_custom_formatter';
// @ts-ignore
import example1SampleCode from '!!raw-loader!./examples/1_using_existing_format';
// @ts-ignore
import example2SampleCodePart1 from '!!raw-loader!../common/example_currency_format';
// @ts-ignore
import example2SampleCodePart2 from '!!raw-loader!./examples/2_creating_custom_formatter';
// @ts-ignore
import example2SampleCodePart3 from '!!raw-loader!../server/examples/2_creating_custom_formatter';
// @ts-ignore
import example3SampleCode from '!!raw-loader!./examples/3_creating_custom_format_editor';

export interface Deps {
  fieldFormats: FieldFormatsStart;

  /**
   * Just for demo purposes
   */
  openDateViewNumberFieldEditor: () => void;
}

const UsingAnExistingFieldFormatExample: React.FC<{ deps: Deps }> = (props) => {
  const sample = example1.getSample(props.deps.fieldFormats);

  return (
    <>
      <EuiText>
        <p>
          This example shows how to use existing field formatter to format values. As an example, we
          have a following sample configuration{' '}
          <EuiCode>{JSON.stringify(example1.sampleSerializedFieldFormat)}</EuiCode> representing a{' '}
          <EuiCode>bytes</EuiCode>
          field formatter with a <EuiCode>0.00b</EuiCode> pattern.
        </p>
      </EuiText>
      <EuiSpacer size={'s'} />
      <EuiCodeBlock>{example1SampleCode}</EuiCodeBlock>
      <EuiSpacer size={'s'} />
      <EuiBasicTable
        data-test-subj={'example1 sample table'}
        items={sample}
        textOnly={true}
        columns={[
          {
            field: 'raw',
            name: 'Raw value',
            'data-test-subj': 'example1 sample raw',
          },
          {
            field: 'formatted',
            name: 'Formatted value',
            'data-test-subj': 'example1 sample formatted',
          },
        ]}
      />
    </>
  );
};

const CreatingCustomFieldFormat: React.FC<{ deps: Deps }> = (props) => {
  const sample = example2.getSample(props.deps.fieldFormats);

  return (
    <>
      <EuiText>
        <p>
          This example shows how to create a custom field formatter. As an example, we create a
          currency formatter and then display some values as <EuiCode>USD</EuiCode>. Custom field
          formatter has to be registered both client and server side.
        </p>
      </EuiText>
      <EuiSpacer size={'s'} />
      <EuiCodeBlock>{example2SampleCodePart1}</EuiCodeBlock>
      <EuiSpacer size={'xs'} />
      <EuiCodeBlock>{example2SampleCodePart2}</EuiCodeBlock>
      <EuiSpacer size={'xs'} />
      <EuiCodeBlock>{example2SampleCodePart3}</EuiCodeBlock>
      <EuiSpacer size={'s'} />
      <EuiBasicTable
        items={sample}
        textOnly={true}
        data-test-subj={'example2 sample table'}
        columns={[
          {
            field: 'raw',
            name: 'Raw value',
            'data-test-subj': 'example2 sample raw',
          },
          {
            field: 'formatted',
            name: 'Formatted value',
            'data-test-subj': 'example2 sample formatted',
          },
        ]}
      />
      <EuiSpacer size={'s'} />

      <EuiCallOut
        title="Seamless integration with data views!"
        color="success"
        iconType="indexManagementApp"
      >
        <p>
          Currency formatter that we&apos;ve just created is already integrated with data views. It
          can be applied to any <EuiCode>numeric</EuiCode> field of any data view.{' '}
          <EuiLink onClick={() => props.deps.openDateViewNumberFieldEditor()}>
            Open data view field editor to give it a try.
          </EuiLink>
        </p>
      </EuiCallOut>
    </>
  );
};

const CreatingCustomFieldFormatEditor: React.FC<{ deps: Deps }> = (props) => {
  return (
    <>
      <EuiText>
        <p>
          This example shows how to create a custom field formatter editor. As an example, we will
          create a format editor for the currency formatter created in the previous section. This
          custom editor will allow to select either <EuiCode>USD</EuiCode> or <EuiCode>EUR</EuiCode>{' '}
          currency.
        </p>
      </EuiText>
      <EuiSpacer size={'s'} />
      <EuiCodeBlock>{example3SampleCode}</EuiCodeBlock>
      <EuiSpacer size={'s'} />

      <EuiCallOut
        title="Check the result in the data view field editor!"
        color="primary"
        iconType="indexManagementApp"
      >
        <p>
          Currency formatter and its custom editor are integrated with data views. It can be applied
          to any <EuiCode>numeric</EuiCode> field of any data view.{' '}
          <EuiLink onClick={() => props.deps.openDateViewNumberFieldEditor()}>
            Open date view field editor to give it a try.
          </EuiLink>
        </p>
      </EuiCallOut>
    </>
  );
};

export const App: React.FC<{ deps: Deps }> = (props) => {
  return (
    <EuiPage>
      <EuiPageBody style={{ maxWidth: 1200, margin: '0 auto' }}>
        <EuiPageHeader>
          <EuiPageHeaderSection>
            <EuiTitle size="l">
              <h1>Field formats examples</h1>
            </EuiTitle>
          </EuiPageHeaderSection>
        </EuiPageHeader>
        <EuiPageContent>
          <EuiPageContentBody style={{ maxWidth: 800, margin: '0 auto' }}>
            <section>
              <EuiTitle size="m">
                <h2>Using an existing field format</h2>
              </EuiTitle>
              <EuiSpacer />
              <UsingAnExistingFieldFormatExample deps={props.deps} />
            </section>
            <EuiSpacer />
            <EuiSpacer />
            <section>
              <EuiTitle size="m">
                <h2>Creating a custom field format</h2>
              </EuiTitle>
              <EuiSpacer />
              <CreatingCustomFieldFormat deps={props.deps} />
            </section>
            <EuiSpacer />
            <EuiSpacer />
            <section>
              <EuiTitle size="m">
                <h2>Creating a custom field format editor</h2>
              </EuiTitle>
              <EuiSpacer />
              <CreatingCustomFieldFormatEditor deps={props.deps} />
            </section>
          </EuiPageContentBody>
        </EuiPageContent>
      </EuiPageBody>
    </EuiPage>
  );
};
