import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';
import { NavbarButton } from '../navbar_button';

import './feedback_button.less';

export const FeedbackButton = ({ show, setShow }) => {
  return (
    <span>
      <NavbarButton onClick={() => setShow(true)} className="pull-right"><i className="fa fa-comment" /> Give Feedback</NavbarButton>
      {show &&
        <Modal.Dialog>
          <Modal.Header className="canvas__feedback-modal--header"/>
          <Modal.Body className="canvas__feedback-modal" style={{ overflow: 'none', position: 'relative' }}>
            <div style={{ position: 'absolute', width: '100%' }}>
              <div style={{ overflow: 'hidden', position: 'relative' }}>
                <iframe src="https://docs.google.com/a/elastic.co/forms/d/e/1FAIpQLSfrHmSrLAWcLx8s4RM_pKP8_BvRGbASGeG-F_fagxUtGu7q4A/viewform?embedded=true"
                width="100%" height="700px" scrolling="no"
                frameBorder="0" marginHeight="0" marginWidth="0">Loading...</iframe>
              </div>
            </div>

          </Modal.Body>

          <Modal.Footer>
            <Button
              onClick={ () => setShow(false) }
            >
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
