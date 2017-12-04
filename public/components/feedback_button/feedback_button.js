import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { NavbarButton } from '../navbar_button';

import './feedback_button.less';

export const FeedbackButton = ({ show, setShow }) => {
  const formId = '1FAIpQLSfrHmSrLAWcLx8s4RM_pKP8_BvRGbASGeG-F_fagxUtGu7q4A';
  const feedbackFormUrl = `https://docs.google.com/a/elastic.co/forms/d/e/${formId}/viewform?embedded=true`;
  const forumLink = text => (
    <a
      rel="noopener noreferrer"
      target="_blank"
      href="https://discuss.elastic.co/c/kibana"
    >
      {text}
    </a>
  );

  return (
    <span>
      <NavbarButton onClick={() => setShow(true)} className="pull-right"><i className="fa fa-comment" />
        Give Feedback
      </NavbarButton>

      {show &&
        <Modal.Dialog dialogClassName="canvas__feedback-modal">
          <Modal.Header className="canvas__feedback-modal--header">Give Feedback</Modal.Header>
          <Modal.Body className="canvas__feedback-modal--body" style={{ overflow: 'none', position: 'relative' }}>
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

              <hr />

            </div>

            <div style={{ position: 'absolute', width: '100%' }}>
              <div style={{ overflow: 'hidden', position: 'relative' }}>
                <iframe
                  src={feedbackFormUrl}
                  width="100%"
                  height="600px"
                  scrolling="no"
                  frameBorder="0"
                  marginHeight="0"
                  marginWidth="0"
                >
                  Loading...
                </iframe>
              </div>
            </div>

          </Modal.Body>

          <Modal.Footer>
            <Button onClick={ () => setShow(false) }>
              Dismiss
            </Button>
          </Modal.Footer>

        </Modal.Dialog>
      }
    </span>
  );
};

FeedbackButton.propTypes = {
  show: PropTypes.any,
  setShow: PropTypes.func,
};
