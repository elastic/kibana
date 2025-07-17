/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import PropTypes from 'prop-types';
import React, { useMemo } from 'react';
import _ from 'lodash';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { visContainerStyle } from '@kbn/visualizations-plugin/public';

const guidPattern = /\[[[a-f\d-\\]{36}\]/g;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  const styles = useMemo(() => {
    return {
      sectionSpacingStyle: css({
        marginTop: euiTheme.size.s,
      }),
      stackStyle: css({
        padding: euiTheme.size.s,
        background: euiTheme.colors.lightestShade,
        color: euiTheme.colors.text,
        lineHeight: euiTheme.font.lineHeightMultiplier,
        fontFamily: euiTheme.font.familyCode,
        fontWeight: euiTheme.font.weight.regular,
        whiteSpace: 'pre-wrap',
      }),
    };
  }, [euiTheme]);
  return styles;
};

export function ErrorComponent(props) {
  const { error } = props;
  let additionalInfo;
  const type = _.get(error, 'error.caused_by.type') || _.get(error, 'error.type');
  let reason = _.get(error, 'error.caused_by.reason');
  const title = _.get(error, 'error.caused_by.title');

  const styles = useStyles();

  if (!reason) {
    reason = _.get(error, 'message');
  }

  if (['runtime_exception', 'illegal_argument_exception'].includes(type)) {
    reason = _.get(error, 'error.reason').replace(guidPattern, ``);
  }

  if (type === 'script_exception') {
    const scriptStack = _.get(error, 'error.caused_by.script_stack');
    reason = _.get(error, 'error.caused_by.caused_by.reason');
    additionalInfo = (
      <div className="tvbError__additional" css={styles.sectionSpacingStyle}>
        <div>{reason}</div>
        <div className="tvbError__stack" css={[styles.sectionSpacingStyle, styles.stackStyle]}>
          {scriptStack.join('\n')}
        </div>
      </div>
    );
  } else if (reason) {
    additionalInfo = (
      <div className="tvbError__additional" css={styles.sectionSpacingStyle}>
        {reason}
      </div>
    );
  }

  return (
    <div className="visError" css={visContainerStyle}>
      <EuiText size="xs" color="subdued">
        <EuiIcon type="warning" size="m" color="danger" aria-hidden="true" />

        <EuiSpacer size="s" />

        {title || (
          <FormattedMessage
            id="visTypeTimeseries.error.requestForPanelFailedErrorMessage"
            defaultMessage="The request for this panel failed"
          />
        )}

        {additionalInfo}
      </EuiText>
    </div>
  );
}

ErrorComponent.propTypes = {
  error: PropTypes.object,
};
