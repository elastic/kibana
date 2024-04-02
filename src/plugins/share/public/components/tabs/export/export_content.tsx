/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReportingAPIClient } from '@kbn/reporting-public';

import { type IShareContext } from '../../context';

type ExportProps = Pick<IShareContext, 'theme' | 'isDirty' | 'objectId'> & {
  reportingAPIClient: ReportingAPIClient;
  getJobParams: Function;
  createReportingJob: Function;
  helpText: FormattedMessage;
  reportType: string;
};

/**
 * Based on {@link URL_MAX_LENGTH} exported from core/public.
 */
const CHROMIUM_MAX_URL_LENGTH = 25 * 1000;

export const getMaxUrlLength = () => CHROMIUM_MAX_URL_LENGTH;

export const ExportContent = ({
  getJobParams,
  theme,
  reportingAPIClient,
  createReportingJob,
  helpText,
  isDirty,
  objectId,
  reportType,
}: ExportProps) => {
  // const isSaved = Boolean(objectId);
  // const isMounted = useMountedState();
  // const [absoluteUrl, setAbsoluteUrl] = useState('');

  // const exceedsMaxLength = absoluteUrl.length >= getMaxUrlLength();

  // const getAbsoluteReportGenerationUrl = useMemo(
  //   () => () => {
  //     const relativePath = reportingAPIClient.getReportingPublicJobPath(
  //       reportType,
  //       reportingAPIClient.getDecoratedJobParams(getJobParams())
  //     );
  //     return setAbsoluteUrl(url.resolve(window.location.href, relativePath));
  //   },
  //   [reportingAPIClient, getJobParams, reportType]
  // );

  // useEffect(() => {
  //   const reportingUrl = new URL(window.location.origin);
  //   reportingUrl.pathname = reportingAPIClient.getReportingPublicJobPath(
  //     reportType,
  //     reportingAPIClient.getDecoratedJobParams(getJobParams())
  //   );
  //   setAbsoluteUrl(reportingUrl.toString());
  // }, [getAbsoluteReportGenerationUrl, reportingAPIClient, getJobParams, reportType]);

  return (
    <>
      test
      {/* <EuiModalBody>{helpText}</EuiModalBody>
      <EuiModalFooter>
        {!isSaved ? (
          <EuiToolTip
            content={i18n.translate('reporting.share.panelContent.unsavedStateErrorTitle', {
              defaultMessage: 'Unsaved work',
            })}
          >
            <EuiButton
              disabled={Boolean(createReportingJob) || isDirty}
              onClick={() => createReportingJob(reportingAPIClient)}
              data-test-subj="generateReportButton"
              isLoading={Boolean(createReportingJob)}
            >
              <FormattedMessage
                id="reporting.share.generateButtonLabel"
                defaultMessage="Generate CSV"
              />
            </EuiButton>
          </EuiToolTip>
        ) : (
          <EuiButton
            disabled={Boolean(createReportingJob) || isDirty}
            fill
            onClick={() => createReportingJob()}
            data-test-subj="generateReportButton"
            isLoading={Boolean(createReportingJob)}
          />
        )}
      </EuiModalFooter> */}
    </>
  );
};
