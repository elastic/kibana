# Import Java packages
include Java

import javax.swing.JFrame

frame = JFrame.new("Hello Swing")
button = javax.swing.JButton.new("Klick Me!")
button.add_action_listener do |evt|
  javax.swing.JOptionPane.showMessageDialog(nil, <<EOS)
<html>Hello from <b><u>JRuby</u></b>.<br>
Button '#{evt.getActionCommand()}' clicked.
EOS
end

# Add the button to the frame
frame.get_content_pane.add(button)

# Show frame
frame.set_default_close_operation(JFrame::EXIT_ON_CLOSE)
frame.pack
frame.visible = true
