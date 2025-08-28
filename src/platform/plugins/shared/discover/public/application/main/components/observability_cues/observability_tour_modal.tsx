import React, { useState, useCallback, useMemo } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiText,
  EuiSpacer,
  EuiListGroup,
  EuiListGroupItem,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiSwitch,
  EuiButton,
  EuiImage,
} from '@elastic/eui';

export interface TourHighlight {
  id: string;
  title: string;
  blurb: string;
  image: string;
  alt: string;
}

export interface ObservabilityTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  highlights: TourHighlight[];
  storageKey: string;
  testSubj?: string;
}

export const ObservabilityTourModal: React.FC<ObservabilityTourModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  highlights,
  storageKey,
  testSubj = 'obsTourModalCloseBtn',
}) => {
  const [selectedHighlight, setSelectedHighlight] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Navigation helpers
  const onPrev = useCallback(() => {
    setSelectedHighlight((s) => (s + highlights.length - 1) % highlights.length);
  }, [highlights.length]);

  const onNext = useCallback(() => {
    setSelectedHighlight((s) => (s + 1) % highlights.length);
  }, [highlights.length]);

  const onFinish = useCallback(() => {
    if (dontShowAgain) {
      localStorage.setItem(storageKey, '1');
    }
    onClose();
  }, [dontShowAgain, storageKey, onClose]);

  // Reset selected highlight when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedHighlight(0);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <EuiModal
      onClose={onClose}
      style={{
        minWidth: 820,
        maxWidth: 920,
        border: 'none',
        boxShadow: 'none',
      }}
      aria-labelledby="observability-tour-modal-title"
    >
      <EuiModalHeader style={{ width: '50%' }}>
        <EuiModalHeaderTitle>{title}</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody
        style={{ position: 'relative', paddingRight: 0, paddingBottom: '24px', width: '50%' }}
      >
        <EuiText color="subdued" size="s">
          <p>{subtitle}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiListGroup>
          {highlights.map((h, i) => (
            <EuiListGroupItem
              key={h.id}
              label={
                <div>
                  <strong>{h.title}</strong>
                  <EuiText size="s" color="subdued">
                    <p style={{ margin: 0 }}>{h.blurb}</p>
                  </EuiText>
                </div>
              }
              isActive={selectedHighlight === i}
              onClick={() => setSelectedHighlight(i)}
              size="s"
              wrapText
            />
          ))}
        </EuiListGroup>

        <EuiFlexGroup
          gutterSize="s"
          alignItems="center"
          responsive={false}
          style={{ marginTop: 12 }}
          justifyContent="spaceBetween"
        >
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="flexStart" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowLeft"
                  onClick={onPrev}
                  aria-label="Previous highlight"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="arrowRight"
                  onClick={onNext}
                  aria-label="Next highlight"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              <p>Change views in space settings</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer />
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiSwitch
              label="Don't show again"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton size="s" fill onClick={onFinish} data-test-subj={testSubj}>
              Got it
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiModalBody>
      {/* Absolutely positioned image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '50%',
          height: '100%',
          overflow: 'hidden',
        }}
      >
        <EuiImage
          url={highlights[selectedHighlight].image}
          alt={highlights[selectedHighlight].alt}
          size="original"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    </EuiModal>
  );
};
