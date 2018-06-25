import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiButton,
  EuiHorizontalRule,
  EuiOverlayMask,
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
} from '@elastic/eui';
import { NavbarButton } from '../navbar_button';

export const FeedbackButton = ({ show, setShow }) => {
  const formId = '1FAIpQLSfrHmSrLAWcLx8s4RM_pKP8_BvRGbASGeG-F_fagxUtGu7q4A';
  const feedbackFormUrl = `https://docs.google.com/a/elastic.co/forms/d/e/${formId}/viewform?embedded=true`;
  const forumLink = text => (
    <a rel="noopener noreferrer" target="_blank" href="https://discuss.elastic.co/c/kibana">
      {text}
    </a>
  );

  const showFeedbackModal = () => setShow(true);
  const closeFeedbackModal = () => setShow(false);

  return (
    <span>
      <NavbarButton onClick={showFeedbackModal} className="pull-right">
        <i className="fa fa-comment" />
        Give Feedback
      </NavbarButton>

      {show && (
        <EuiOverlayMask>
          <EuiModal className="canvas__feedback-modal" onClose={closeFeedbackModal}>
            <EuiModalHeader className="canvas__feedback-modal--header">
              <EuiModalHeaderTitle>Give Feedback</EuiModalHeaderTitle>
            </EuiModalHeader>
            <EuiModalBody
              className="canvas__feedback-modal--body"
              style={{ overflow: 'none', position: 'relative' }}
            >
              <div className="message">
                <p>
                  Use the form below to provide feedback about Canvas, which only the people working
                  on Canvas will be able to see. Keep in mind that we won't be able to contact you
                  about your feedback.
                </p>
                <p>
                  If you have a question or would like to post public feedback and have a public
                  discussion, {forumLink('please use the Kibana forums instead')}.
                </p>
              </div>

              <EuiHorizontalRule margin="s" />

              <div className="feedback-form">
                <iframe
                  src={feedbackFormUrl}
                  width="100%"
                  height="550px"
                  frameBorder="0"
                  marginHeight="0"
                  marginWidth="0"
                >
                  Loading...
                </iframe>
              </div>
            </EuiModalBody>

            <EuiModalFooter>
              <EuiButton onClick={closeFeedbackModal}>Dismiss</EuiButton>
            </EuiModalFooter>
          </EuiModal>
        </EuiOverlayMask>
      )}
    </span>
  );
};

FeedbackButton.propTypes = {
  show: PropTypes.any,
  setShow: PropTypes.func,
};
