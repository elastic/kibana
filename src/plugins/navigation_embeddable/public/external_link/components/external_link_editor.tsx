/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce, isEmpty } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';

import { EuiFormRow, EuiFieldText } from '@elastic/eui';

import { ExternalLinkInput } from '../types';
import { LinkEditorProps } from '../../navigation_container/types';
import { ExternalLinkEmbeddableStrings } from './external_link_strings';
import { NavEmbeddableStrings } from '../../navigation_container/components/navigation_embeddable_strings';

// TODO: As part of https://github.com/elastic/kibana/issues/154381, replace this regex URL check with more robust url validation
const isValidUrl =
  /^https?:\/\/(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/;

export const ExternalLinkEditor = ({ onChange }: LinkEditorProps<ExternalLinkInput>) => {
  const [linkLabel, setLinkLabel] = useState<string>('');
  const [validUrl, setValidUrl] = useState<boolean>(true);
  const [linkUrl, setLinkUrl] = useState<string | undefined>();

  const debouncedOnChange = useMemo(
    () =>
      debounce((newInput: Partial<ExternalLinkInput>, valid: boolean) => {
        onChange(newInput, valid);
      }),
    [onChange]
  );

  useEffect(() => {
    if (linkUrl && validUrl) {
      debouncedOnChange(
        !isEmpty(linkLabel) ? { url: linkUrl, label: linkLabel } : { url: linkUrl },
        true
      );
    } else {
      debouncedOnChange({}, false);
    }
  }, [linkUrl, linkLabel, validUrl, debouncedOnChange]);

  return (
    <>
      <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkDestinationLabel()}>
        <EuiFieldText
          placeholder={ExternalLinkEmbeddableStrings.getPlaceholder()}
          isInvalid={!validUrl}
          onChange={(e) => {
            const url = e.target.value;
            const isValid = isValidUrl.test(url);
            setValidUrl(isValid);
            setLinkUrl(isValid ? url : undefined);
          }}
        />
      </EuiFormRow>
      <EuiFormRow label={NavEmbeddableStrings.editor.linkEditor.getLinkTextLabel()}>
        <EuiFieldText
          placeholder={NavEmbeddableStrings.editor.linkEditor.getLinkTextPlaceholder()}
          value={linkLabel}
          onChange={(e) => {
            setLinkLabel(e.target.value);
          }}
        />
      </EuiFormRow>

      {/* TODO: As part of https://github.com/elastic/kibana/issues/154381, we should pull in the custom settings for each link type.
            Refer to `x-pack/examples/ui_actions_enhanced_examples/public/drilldowns/dashboard_to_discover_drilldown/collect_config_container.tsx`
            for the dashboard drilldown settings, for example. 

            Open question: It probably makes sense to re-use these components so any changes made to the drilldown architecture
            trickle down to the navigation embeddable - this would require some refactoring, though. Is this a goal for MVP?
         */}
    </>
  );
};
